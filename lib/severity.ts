import type { Confidence, Finding, Severity, VulnerabilityType } from "./types";

export const SEVERITY_ORDER: Severity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "informational",
];

export const SEVERITY_RANK: Record<Severity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  informational: 1,
};

export const SEVERITY_STYLES: Record<Severity, string> = {
  critical: "bg-[#fdecec] text-[#a32121] border-[#f3c4c4]",
  high: "bg-[#fdf1e7] text-[#9a4a12] border-[#f0d3bb]",
  medium: "bg-[#fdf8e6] text-[#8a6a10] border-[#ecdfb5]",
  low: "bg-[#eef4fa] text-[#2d5b86] border-[#cfdff0]",
  informational: "bg-[#f2f4f7] text-[#4a5568] border-[#dfe4ea]",
};

export const CONFIDENCE_STYLES: Record<Confidence, string> = {
  high: "bg-[#edf6f0] text-[#24603b] border-[#c8e3d1]",
  medium: "bg-[#fdf8e6] text-[#8a6a10] border-[#ecdfb5]",
  low: "bg-[#f2f4f7] text-[#4a5568] border-[#dfe4ea]",
};

export const STATUS_STYLES: Record<string, string> = {
  queued: "bg-[#f2f4f7] text-[#4a5568] border-[#dfe4ea]",
  running: "bg-[#eef4fa] text-[#2d5b86] border-[#cfdff0]",
  completed: "bg-[#edf6f0] text-[#24603b] border-[#c8e3d1]",
  failed: "bg-[#fdecec] text-[#a32121] border-[#f3c4c4]",
  cancelled: "bg-[#f2f4f7] text-[#4a5568] border-[#dfe4ea]",
};

export const SEVERITY_DESCRIPTIONS: Record<Severity, string> = {
  critical:
    "Direct, high-impact compromise is demonstrated (for example authentication bypass or remote code execution) with strong evidence.",
  high:
    "The issue is exploitable and can lead to significant data exposure or client-side compromise.",
  medium:
    "The issue is exploitable under common conditions but impact or reliability is moderate.",
  low: "Limited impact, or exploitation requires unusual preconditions.",
  informational:
    "A weakness or observation without demonstrated security impact.",
};

export const TYPE_LABELS: Record<VulnerabilityType, string> = {
  sqli: "SQL Injection",
  xss: "Cross-Site Scripting",
};

export const SQLI_REMEDIATION =
  "Use parameterized queries or prepared statements for every database access. Never concatenate untrusted input into SQL. Apply least-privilege database accounts, validate input types, and avoid revealing database error details to users. ORM query builders must be used with bound parameters rather than raw string interpolation.";

export const SQLI_REFERENCES = [
  "https://owasp.org/www-community/attacks/SQL_Injection",
  "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html",
  "https://cwe.mitre.org/data/definitions/89.html",
];

export const XSS_REMEDIATION =
  "Apply context-aware output encoding for HTML, attribute, JavaScript and URL contexts. Prefer safe DOM APIs such as textContent and avoid assigning untrusted values to innerHTML. Validate and sanitize rich HTML with a maintained sanitizer, and deploy a restrictive Content Security Policy as defence in depth.";

export const XSS_REFERENCES = [
  "https://owasp.org/www-community/attacks/xss/",
  "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html",
  "https://cwe.mitre.org/data/definitions/79.html",
];

export const SCAN_DISCLAIMER =
  "An automated scan cannot guarantee that an application is completely secure. Results should be reviewed and validated by an authorized security professional.";

export interface FindingSummary {
  total: number;
  sqli: number;
  xss: number;
  bySeverity: Record<Severity, number>;
  verified: number;
  unverified: number;
}

export function summarizeFindings(findings: Finding[]): FindingSummary {
  const bySeverity: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    informational: 0,
  };
  let sqli = 0;
  let xss = 0;
  let verified = 0;

  for (const finding of findings) {
    bySeverity[finding.severity] += 1;
    if (finding.type === "sqli") sqli += 1;
    if (finding.type === "xss") xss += 1;
    if (finding.verification === "verified") verified += 1;
  }

  return {
    total: findings.length,
    sqli,
    xss,
    bySeverity,
    verified,
    unverified: findings.length - verified,
  };
}

export function sortFindings(findings: Finding[]) {
  return [...findings].sort((a, b) => {
    const bySeverity = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (bySeverity !== 0) return bySeverity;
    return a.detectedAt.localeCompare(b.detectedAt);
  });
}
