import { NextResponse } from "next/server";
import { z } from "zod";
import { runDemoScan } from "@/lib/scanner/engine";
import { checkRateLimit, clientKeyFromRequest } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const demoScanSchema = z.object({
  name: z.string().trim().min(1, "Scan name is required").max(120),
  target: z.string().trim().max(2048).optional(),
  scope: z.enum(["full", "single-page", "parameters-only"]).default("full"),
  sqli: z.boolean().default(true),
  xss: z.boolean().default(true),
});

export async function POST(request: Request) {
  const limit = checkRateLimit(clientKeyFromRequest(request));
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many scan requests. Please wait and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = demoScanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid scan request." },
      { status: 400 },
    );
  }
  if (!parsed.data.sqli && !parsed.data.xss) {
    return NextResponse.json(
      { error: "Enable at least one test module (SQL Injection or XSS)." },
      { status: 400 },
    );
  }

  const scan = runDemoScan({
    name: parsed.data.name,
    target: parsed.data.target,
    scope: parsed.data.scope,
    sqli: parsed.data.sqli,
    xss: parsed.data.xss,
  });

  return NextResponse.json({ scan }, { status: 201 });
}
