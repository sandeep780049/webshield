import { beforeEach, describe, expect, it } from "vitest";
import { POST as demoScanRoute } from "@/app/api/scan/demo/route";
import { POST as externalScanRoute } from "@/app/api/scan/external/route";
import { GET as integrationsStatusRoute } from "@/app/api/integrations/status/route";
import { resetRateLimits } from "@/lib/security/rate-limit";
import { buildReportData, createPdfDocument, reportFileName } from "@/lib/reports";
import { runDemoScan } from "@/lib/scanner/engine";
import { SCAN_DISCLAIMER } from "@/lib/severity";

function jsonRequest(body: unknown, ip = "203.0.113.10") {
  return new Request("http://localhost:3000/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  resetRateLimits();
  delete process.env.ZAP_API_URL;
  delete process.env.ZAP_API_KEY;
  delete process.env.AUTHORIZED_SCAN_DOMAINS;
});

describe("demo scan API", () => {
  it("runs a demo scan and returns findings", async () => {
    const response = await demoScanRoute(
      jsonRequest({ name: "API demo scan", scope: "full", sqli: true, xss: true }, "203.0.113.11"),
    );
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.scan.status).toBe("completed");
    expect(data.scan.findings.length).toBeGreaterThan(0);
    expect(data.scan.checks.length).toBeGreaterThan(0);
    expect(data.scan.mode).toBe("demo");
  });

  it("rejects an invalid request body", async () => {
    const response = await demoScanRoute(jsonRequest({ name: "" }, "203.0.113.12"));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeTruthy();
  });

  it("rejects a scan with both modules disabled", async () => {
    const response = await demoScanRoute(
      jsonRequest({ name: "Nothing enabled", sqli: false, xss: false }, "203.0.113.13"),
    );
    expect(response.status).toBe(400);
  });
});

describe("external scan API", () => {
  it("reports external scanning as disabled when ZAP is not configured", async () => {
    const response = await externalScanRoute(
      jsonRequest(
        {
          name: "External",
          target: "https://example.com",
          scope: "full",
          sqli: true,
          xss: true,
          authorizationConfirmed: true,
        },
        "203.0.113.14",
      ),
    );
    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data.error).toBe("External scanner not configured");
    expect(data.code).toBe("ZAP_NOT_CONFIGURED");
  });

  it("rejects private and localhost targets before contacting ZAP", async () => {
    process.env.ZAP_API_URL = "https://zap.example.com";
    process.env.ZAP_API_KEY = "test-only-key";
    process.env.AUTHORIZED_SCAN_DOMAINS = "example.com";

    const response = await externalScanRoute(
      jsonRequest(
        {
          name: "Localhost attempt",
          target: "http://127.0.0.1/admin",
          scope: "full",
          sqli: true,
          xss: true,
          authorizationConfirmed: true,
        },
        "203.0.113.15",
      ),
    );
    expect([400, 403]).toContain(response.status);
    const data = await response.json();
    expect(data.error).toMatch(/blocked|private|loopback|allowlist/i);
  });

  it("requires authorization confirmation", async () => {
    process.env.ZAP_API_URL = "https://zap.example.com";
    process.env.ZAP_API_KEY = "test-only-key";
    const response = await externalScanRoute(
      jsonRequest(
        {
          name: "No confirmation",
          target: "https://example.com",
          scope: "full",
          sqli: true,
          xss: true,
          authorizationConfirmed: false,
        },
        "203.0.113.16",
      ),
    );
    expect(response.status).toBe(403);
  });
});

describe("integration status API", () => {
  it("never exposes secrets", async () => {
    process.env.ZAP_API_URL = "https://zap.example.com";
    process.env.ZAP_API_KEY = "super-secret-zap-key";
    process.env.AUTHORIZED_SCAN_DOMAINS = "example.com";

    const response = await integrationsStatusRoute();
    const text = JSON.stringify(await response.json());

    expect(text).not.toContain("super-secret-zap-key");
    expect(text.toLowerCase()).not.toContain("apikey");
    expect(text).not.toContain("service_role");
    expect(text).not.toContain(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "undefined-anon-key");
  });

  it("reports the Safe Demo Lab as always available", async () => {
    const response = await integrationsStatusRoute();
    const data = await response.json();
    expect(data.demoLab.available).toBe(true);
    expect(data.zap.configured).toBe(false);
    expect(data.zap.message).toMatch(/not configured/i);
  });
});

describe("report generation", () => {
  const scan = runDemoScan({ name: "Report scan", sqli: true, xss: true });

  it("builds a JSON report with all required fields", () => {
    const report = buildReportData(scan);
    expect(report.project).toBe("WebShield");
    expect(report.scan.id).toBe(scan.id);
    expect(report.scan.target).toBeTruthy();
    expect(report.scan.scanDate).toBeTruthy();
    expect(report.scan.pagesTested).toBeGreaterThan(0);
    expect(report.scan.parametersTested).toBeGreaterThan(0);
    expect(report.summary.sqlInjection).toBeGreaterThan(0);
    expect(report.summary.crossSiteScripting).toBeGreaterThan(0);
    expect(report.findings.length).toBe(scan.findings.length);
    expect(report.findings[0].evidence).toBeTruthy();
    expect(report.findings[0].remediation).toBeTruthy();
    expect(report.limitations.length).toBeGreaterThan(0);
    expect(report.disclaimer).toBe(SCAN_DISCLAIMER);
    expect(reportFileName(scan, "json")).toMatch(/^webshield-report-scan-[a-z0-9-]+\.json$/i);
  });

  it("generates a valid PDF document", async () => {
    const doc = await createPdfDocument(scan);
    const output = doc.output();
    expect(output.startsWith("%PDF")).toBe(true);
    expect(output.length).toBeGreaterThan(1000);
  });
});
