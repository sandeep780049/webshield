import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, clientKeyFromRequest } from "@/lib/security/rate-limit";
import { ScanValidationError, parseAllowedDomains, validateExternalTarget } from "@/lib/security/url-guard";
import {
  classifyZapAlert,
  getZapActiveScanStatus,
  getZapAlerts,
  getZapConfig,
  getZapSpiderStatus,
  startZapActiveScan,
  startZapSpider,
} from "@/lib/zap";
import type { Scan } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const externalScanSchema = z.object({
  name: z.string().trim().min(1).max(120),
  target: z.string().trim().min(1).max(2048),
  scope: z.enum(["full", "single-page", "parameters-only"]).default("full"),
  sqli: z.boolean().default(true),
  xss: z.boolean().default(true),
  authorizationConfirmed: z.boolean(),
});

interface ExternalJob {
  scan: Scan;
  target: string;
}

/**
 * Instance-local job registry used for status polling. ZAP itself performs the
 * heavy work asynchronously, so no Vercel function is held open for the scan.
 * For multi-instance production use, persist this record in Supabase instead.
 */
const jobs = new Map<string, ExternalJob>();

function notConfigured() {
  return NextResponse.json(
    {
      error: "External scanner not configured",
      message:
        "OWASP ZAP is not configured on this deployment. Use the Safe Demo Lab, or set ZAP_API_URL and ZAP_API_KEY on the server.",
      code: "ZAP_NOT_CONFIGURED",
    },
    { status: 503 },
  );
}

export async function POST(request: Request) {
  const limit = checkRateLimit(clientKeyFromRequest(request));
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many scan requests. Please wait and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const config = getZapConfig();
  if (!config.configured) return notConfigured();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = externalScanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid scan request." },
      { status: 400 },
    );
  }
  if (!parsed.data.authorizationConfirmed) {
    return NextResponse.json(
      { error: "You must confirm that you own the target or have explicit written authorization." },
      { status: 403 },
    );
  }
  if (!parsed.data.sqli && !parsed.data.xss) {
    return NextResponse.json({ error: "Enable at least one test module." }, { status: 400 });
  }

  try {
    const validated = await validateExternalTarget(parsed.data.target, parseAllowedDomains());
    const normalizedTarget = validated.url.toString();

    const spider = await startZapSpider(config, normalizedTarget);
    const active = await startZapActiveScan(config, normalizedTarget);

    const scanId = randomUUID();
    const startedAt = new Date().toISOString();
    const scan: Scan = {
      id: scanId,
      name: parsed.data.name,
      target: normalizedTarget,
      mode: "external",
      scope: parsed.data.scope,
      status: "running",
      tests: { sqli: parsed.data.sqli, xss: parsed.data.xss },
      engine: "OWASP ZAP (external)",
      startedAt,
      pagesTested: 0,
      parametersTested: 0,
      checks: [],
      findings: [],
      authorizationConfirmed: true,
    };

    jobs.set(scanId, { scan, target: normalizedTarget });

    return NextResponse.json(
      {
        scan,
        pollUrl: `/api/scan/external?id=${scanId}`,
        note: "The scan runs on the external ZAP instance. Poll the status endpoint until the scan completes.",
        spiderScanId: spider.scan,
        activeScanId: active.scan,
      },
      { status: 202 },
    );
  } catch (error) {
    if (error instanceof ScanValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Failed to start external scan", error);
    return NextResponse.json(
      { error: "The external scanner could not be reached. Check the ZAP integration settings." },
      { status: 502 },
    );
  }
}

export async function GET(request: Request) {
  const config = getZapConfig();
  if (!config.configured) return notConfigured();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "A scan id is required." }, { status: 400 });
  }
  const job = jobs.get(id);
  if (!job) {
    return NextResponse.json({ error: "Scan job not found on this instance." }, { status: 404 });
  }

  const scan = job.scan;
  if (scan.status === "completed" || scan.status === "failed" || scan.status === "cancelled") {
    return NextResponse.json({ scan });
  }

  const elapsed = Date.now() - new Date(scan.startedAt).getTime();
  if (elapsed > config.timeoutMs) {
    job.scan = {
      ...scan,
      status: "failed",
      error: "The external scan exceeded the configured timeout.",
      completedAt: new Date().toISOString(),
    };
    return NextResponse.json({ scan: job.scan });
  }

  try {
    const alerts = await getZapAlerts(config, job.target);
    const findings = alerts
      .map((alert, index) => classifyZapAlert(alert, scan.id, index))
      .filter((finding): finding is NonNullable<typeof finding> => Boolean(finding))
      .filter((finding) => (finding.type === "sqli" ? scan.tests.sqli : scan.tests.xss));

    const activeStatus = await getZapActiveScanStatus(config, id);
    const spiderStatus = await getZapSpiderStatus(config, id);

    const updated: Scan = {
      ...scan,
      pagesTested: scan.pagesTested,
      findings,
      status: "running",
    };
    job.scan = updated;

    return NextResponse.json({
      scan: updated,
      progress: { activeScan: activeStatus, spider: spiderStatus },
    });
  } catch (error) {
    console.error("Failed to poll external scan", error);
    job.scan = {
      ...scan,
      status: "failed",
      error: "Lost contact with the external scanner while polling.",
      completedAt: new Date().toISOString(),
    };
    return NextResponse.json({ scan: job.scan }, { status: 502 });
  }
}
