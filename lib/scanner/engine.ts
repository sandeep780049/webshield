import { randomUUID } from "node:crypto";
import { SEVERITY_RANK, SQLI_REFERENCES, SQLI_REMEDIATION, XSS_REFERENCES, XSS_REMEDIATION } from "../severity";
import type {
  Confidence,
  Finding,
  Scan,
  ScanCheck,
  ScanRequest,
  ScanScope,
  Severity,
} from "../types";
import {
  SQLI_FIXTURES,
  XSS_FIXTURES,
  demoPage,
  type SqliFixture,
  type XssFixture,
} from "./fixtures";
import { detectSqli } from "./sqli";
import { detectXss } from "./xss";

export interface DemoScanInput {
  name: string;
  target?: string;
  scope?: ScanScope;
  sqli?: boolean;
  xss?: boolean;
}

function selectedFixtures<T extends { method: "GET" | "POST" }>(
  fixtures: T[],
  scope: ScanScope,
): T[] {
  if (scope === "single-page") return fixtures.slice(0, 1);
  if (scope === "parameters-only") return fixtures.filter((f) => f.method === "GET");
  return fixtures;
}

function buildRequestLine(
  method: "GET" | "POST",
  path: string,
  parameter: string,
  payload: string,
) {
  const encoded = encodeURIComponent(payload);
  if (method === "POST") {
    return `POST ${path} HTTP/1.1\nHost: webshield-demo\nContent-Type: application/x-www-form-urlencoded\n\n${parameter}=${encoded}`;
  }
  return `GET ${path}?${parameter}=${encoded} HTTP/1.1\nHost: webshield-demo`;
}

function sqliFinding(
  scanId: string,
  fixture: SqliFixture,
  detection: ReturnType<typeof detectSqli>,
  index: number,
): Finding {
  const kindLabels: Record<string, string> = {
    error: "error-based",
    boolean: "boolean-based",
    time: "time-based",
    "auth-bypass": "authentication bypass",
  };
  const kind = detection.kind ?? "error";
  const severity: Severity = "high";
  const confidence: Confidence = detection.confidence;
  const verificationMethod =
    kind === "error"
      ? "sql-error-signature"
      : kind === "time"
        ? "time-based-response"
        : "boolean-differential";

  const responseSnippet =
    detection.simulation.error ??
    (kind === "time"
      ? `Response timing: ${detection.simulation.delayMs} ms (baseline ~3 ms)\nRows returned: ${detection.simulation.rowCount}`
      : `Rows returned with TRUE payload: ${detection.simulation.rowCount}\nRows returned with FALSE payload: ${detection.pairedSimulation?.rowCount ?? 0}`);

  return {
    id: `f_${scanId}_${index + 1}`,
    scanId,
    type: "sqli",
    category: "sql-injection",
    title: `SQL Injection (${kindLabels[kind]}) in "${fixture.parameter}"`,
    description: `${fixture.description} The scanner sent ${detection.payloadsTested} controlled probes and observed a ${kindLabels[kind]} indicator. This is a simulated Safe Demo Lab finding, not a result from a real website.`,
    url: demoPage(fixture.path),
    method: fixture.method,
    parameter: fixture.parameter,
    severity,
    confidence,
    verification: "verified",
    verificationMethod,
    detectedAt: new Date().toISOString(),
    evidence: {
      payload: detection.payload.value,
      request: buildRequestLine(fixture.method, fixture.path, fixture.parameter, detection.payload.value),
      responseSnippet,
      analysis: detection.summary,
      simulated: true,
    },
    risk:
      "An attacker could alter database queries to read or modify records they are not authorised to access, bypass authentication, or in some configurations execute operating-system commands.",
    remediation: SQLI_REMEDIATION,
    references: SQLI_REFERENCES,
    source: "demo-lab",
  };
}

function xssFinding(
  scanId: string,
  fixture: XssFixture,
  detection: ReturnType<typeof detectXss>,
  index: number,
): Finding {
  const category =
    detection.kind === "stored"
      ? ("stored-xss" as const)
      : detection.kind === "dom"
        ? ("dom-xss" as const)
        : ("reflected-xss" as const);
  const categoryLabel =
    category === "stored-xss"
      ? "Stored Cross-Site Scripting"
      : category === "dom-xss"
        ? "DOM-based Cross-Site Scripting"
        : "Reflected Cross-Site Scripting";

  return {
    id: `f_${scanId}_${index + 1}`,
    scanId,
    type: "xss",
    category,
    title: `${categoryLabel} in "${fixture.parameter}"`,
    description: `${fixture.description} The scanner sent ${detection.payloadsTested} probes and verified unsafe handling. This is a simulated Safe Demo Lab finding, not a result from a real website.`,
    url: demoPage(fixture.path),
    method: fixture.method,
    parameter: fixture.parameter,
    severity: detection.severity,
    confidence: detection.confidence,
    verification: "verified",
    verificationMethod: detection.verificationMethod,
    detectedAt: new Date().toISOString(),
    evidence: {
      payload: detection.payload.value,
      request: buildRequestLine(fixture.method, fixture.path, fixture.parameter, detection.payload.value),
      responseSnippet: excerpt(detection.simulation.response, detection.payload.value),
      analysis: detection.summary,
      simulated: true,
    },
    risk:
      "An attacker could execute script in a victim's browser session, steal session data, modify page content, or perform actions as the victim.",
    remediation: XSS_REMEDIATION,
    references: XSS_REFERENCES,
    source: "demo-lab",
  };
}

function excerpt(html: string, payload: string) {
  const index = html.indexOf(payload);
  if (index === -1) {
    return html.slice(0, 420);
  }
  const start = Math.max(0, index - 180);
  const end = Math.min(html.length, index + payload.length + 180);
  return `${start > 0 ? "…" : ""}${html.slice(start, end)}${end < html.length ? "…" : ""}`;
}

export function runDemoScan(input: DemoScanInput): Scan {
  const scanId = randomUUID();
  const startedAt = new Date();
  const scope = input.scope ?? "full";
  const tests = {
    sqli: input.sqli ?? true,
    xss: input.xss ?? true,
  };
  if (!tests.sqli && !tests.xss) {
    tests.sqli = true;
    tests.xss = true;
  }

  const findings: Finding[] = [];
  const checks: ScanCheck[] = [];

  if (tests.sqli) {
    for (const fixture of selectedFixtures(SQLI_FIXTURES, scope)) {
      const detection = detectSqli(fixture);
      if (detection.vulnerable) {
        const finding = sqliFinding(scanId, fixture, detection, findings.length);
        findings.push(finding);
        checks.push({
          id: `c_${scanId}_${checks.length + 1}`,
          fixtureId: fixture.id,
          label: fixture.title,
          type: "sqli",
          path: fixture.path,
          parameter: fixture.parameter,
          result: "finding",
          evidenceSummary: detection.summary,
          findingId: finding.id,
        });
      } else {
        checks.push({
          id: `c_${scanId}_${checks.length + 1}`,
          fixtureId: fixture.id,
          label: fixture.title,
          type: "sqli",
          path: fixture.path,
          parameter: fixture.parameter,
          result: "passed",
          evidenceSummary: detection.summary,
        });
      }
    }
  }

  if (tests.xss) {
    for (const fixture of selectedFixtures(XSS_FIXTURES, scope)) {
      const detection = detectXss(fixture);
      if (detection.vulnerable) {
        const finding = xssFinding(scanId, fixture, detection, findings.length);
        findings.push(finding);
        checks.push({
          id: `c_${scanId}_${checks.length + 1}`,
          fixtureId: fixture.id,
          label: fixture.title,
          type: "xss",
          path: fixture.path,
          parameter: fixture.parameter,
          result: "finding",
          evidenceSummary: detection.summary,
          findingId: finding.id,
        });
      } else {
        checks.push({
          id: `c_${scanId}_${checks.length + 1}`,
          fixtureId: fixture.id,
          label: fixture.title,
          type: "xss",
          path: fixture.path,
          parameter: fixture.parameter,
          result: "passed",
          evidenceSummary: detection.summary,
        });
      }
    }
  }

  const completedAt = new Date();
  const pagesTested = new Set(checks.map((check) => check.path)).size;

  findings.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);

  return {
    id: scanId,
    name: input.name,
    target: input.target?.trim() || "webshield-demo://safe-lab",
    mode: "demo",
    scope,
    status: "completed",
    tests,
    engine: "WebShield Safe Demo Lab v1 (deterministic fixtures)",
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    durationMs: Math.max(completedAt.getTime() - startedAt.getTime(), 1),
    pagesTested,
    parametersTested: checks.length,
    checks,
    findings,
  };
}

export function isDemoScanRequest(request: ScanRequest) {
  return request.mode === "demo";
}
