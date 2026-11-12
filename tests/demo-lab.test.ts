import { describe, expect, it } from "vitest";
import { runDemoScan } from "@/lib/scanner/engine";
import { SQLI_FIXTURES, XSS_FIXTURES } from "@/lib/scanner/fixtures";
import { detectSqli } from "@/lib/scanner/sqli";
import { detectXss } from "@/lib/scanner/xss";

function demoScan(overrides: Partial<Parameters<typeof runDemoScan>[0]> = {}) {
  return runDemoScan({
    name: "Test demo scan",
    sqli: true,
    xss: true,
    scope: "full",
    ...overrides,
  });
}

describe("Safe Demo Lab: SQL injection fixtures", () => {
  it("detects the deliberately vulnerable SQLi fixtures", () => {
    const vulnerable = SQLI_FIXTURES.filter((fixture) => fixture.expected === "vulnerable");
    expect(vulnerable.length).toBeGreaterThan(0);
    for (const fixture of vulnerable) {
      const detection = detectSqli(fixture);
      expect(detection.vulnerable, fixture.id).toBe(true);
      expect(detection.payloadsTested).toBeGreaterThan(1);
      expect(detection.summary.length).toBeGreaterThan(20);
    }
  });

  it("does not report the parameterized fixtures as vulnerable", () => {
    const safe = SQLI_FIXTURES.filter((fixture) => fixture.expected === "safe");
    expect(safe.length).toBeGreaterThan(0);
    for (const fixture of safe) {
      const detection = detectSqli(fixture);
      expect(detection.vulnerable, fixture.id).toBe(false);
      expect(detection.kind).toBeNull();
    }
  });

  it("classifies SQLi separately from XSS and never defaults to critical", () => {
    const scan = demoScan();
    const sqli = scan.findings.filter((finding) => finding.type === "sqli");
    const xss = scan.findings.filter((finding) => finding.type === "xss");
    expect(sqli.length).toBeGreaterThan(0);
    expect(xss.length).toBeGreaterThan(0);
    for (const finding of sqli) {
      expect(finding.category).toBe("sql-injection");
      expect(finding.severity).not.toBe("critical");
      expect(["high", "medium"]).toContain(finding.severity);
      expect(finding.evidence.payload.length).toBeGreaterThan(0);
      expect(finding.evidence.analysis.length).toBeGreaterThan(0);
      expect(finding.evidence.simulated).toBe(true);
      expect(finding.remediation).toMatch(/parameterized|prepared statements/i);
    }
  });
});

describe("Safe Demo Lab: XSS fixtures", () => {
  it("detects reflected, stored and DOM-based XSS", () => {
    const scan = demoScan();
    const categories = scan.findings
      .filter((finding) => finding.type === "xss")
      .map((finding) => finding.category);
    expect(categories).toContain("reflected-xss");
    expect(categories).toContain("stored-xss");
    expect(categories).toContain("dom-xss");
  });

  it("does not report safe/encoded fixtures as vulnerable", () => {
    const safe = XSS_FIXTURES.filter((fixture) => fixture.expected === "safe");
    expect(safe.length).toBeGreaterThanOrEqual(3);
    for (const fixture of safe) {
      const detection = detectXss(fixture);
      expect(detection.vulnerable, fixture.id).toBe(false);
    }
  });

  it("records verification method and avoids claiming script execution", () => {
    const scan = demoScan();
    const xss = scan.findings.filter((finding) => finding.type === "xss");
    expect(xss.some((finding) => finding.verificationMethod === "payload-reflection")).toBe(true);
    expect(xss.some((finding) => finding.verificationMethod === "dom-sink-analysis")).toBe(true);
    for (const finding of xss) {
      expect(finding.verification).toBe("verified");
      expect(finding.evidence.request).toContain(finding.parameter);
      expect(finding.references.length).toBeGreaterThan(0);
    }
    expect(xss.some((finding) => /execution confirmed/i.test(finding.evidence.analysis))).toBe(false);
  });
});

describe("Safe Demo Lab: scan workflow", () => {
  it("completes with status, coverage and passed safe checks", () => {
    const scan = demoScan();
    expect(scan.status).toBe("completed");
    expect(scan.mode).toBe("demo");
    expect(scan.pagesTested).toBeGreaterThan(0);
    expect(scan.parametersTested).toBe(scan.checks.length);
    expect(scan.checks.some((check) => check.result === "passed")).toBe(true);
    expect(scan.findings.length).toBe(scan.checks.filter((check) => check.result === "finding").length);
    expect(scan.completedAt).toBeTruthy();
    expect(scan.durationMs).toBeGreaterThan(0);
  });

  it("honours module toggles", () => {
    const onlySqli = demoScan({ sqli: true, xss: false });
    expect(onlySqli.findings.every((finding) => finding.type === "sqli")).toBe(true);
    expect(onlySqli.checks.every((check) => check.type === "sqli")).toBe(true);

    const onlyXss = demoScan({ sqli: false, xss: true });
    expect(onlyXss.findings.every((finding) => finding.type === "xss")).toBe(true);
    expect(onlyXss.checks.every((check) => check.type === "xss")).toBe(true);
  });

  it("narrows coverage for the single-page scope", () => {
    const full = demoScan();
    const single = demoScan({ scope: "single-page" });
    expect(single.parametersTested).toBeLessThan(full.parametersTested);
    expect(single.parametersTested).toBe(2);
  });

  it("attaches evidence to every finding", () => {
    const scan = demoScan();
    for (const finding of scan.findings) {
      expect(finding.evidence.payload).toBeTruthy();
      expect(finding.evidence.request).toBeTruthy();
      expect(finding.evidence.responseSnippet).toBeTruthy();
      expect(finding.url.startsWith("webshield-demo://lab/")).toBe(true);
      expect(finding.description).toMatch(/simulated/i);
    }
  });
});
