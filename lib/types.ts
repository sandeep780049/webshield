export type Severity = "critical" | "high" | "medium" | "low" | "informational";
export type Confidence = "high" | "medium" | "low";
export type ScanMode = "demo" | "external";
export type ScanStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type VulnerabilityType = "sqli" | "xss";

export type FindingCategory =
  | "sql-injection"
  | "reflected-xss"
  | "stored-xss"
  | "dom-xss";

export type ScanScope = "full" | "single-page" | "parameters-only";

export type VerificationMethod =
  | "sql-error-signature"
  | "boolean-differential"
  | "time-based-response"
  | "payload-reflection"
  | "stored-payload-replay"
  | "dom-sink-analysis"
  | "zap-alert";

export interface FindingEvidence {
  /** The exact payload sent to the fixture under test. */
  payload: string;
  /** Human-readable request representation. */
  request: string;
  /** The relevant part of the simulated or real response. */
  responseSnippet: string;
  /** What the detector concluded from the response. */
  analysis: string;
  /** True for Safe Demo Lab fixtures, false for real external targets. */
  simulated: boolean;
}

export interface Finding {
  id: string;
  scanId: string;
  type: VulnerabilityType;
  category: FindingCategory;
  title: string;
  description: string;
  url: string;
  method: "GET" | "POST";
  parameter: string;
  severity: Severity;
  confidence: Confidence;
  verification: "verified" | "unverified";
  verificationMethod: VerificationMethod;
  detectedAt: string;
  evidence: FindingEvidence;
  risk: string;
  remediation: string;
  references: string[];
  source: "demo-lab" | "zap";
}

export interface ScanCheck {
  id: string;
  fixtureId: string;
  label: string;
  type: VulnerabilityType;
  path: string;
  parameter: string;
  result: "finding" | "passed";
  evidenceSummary: string;
  findingId?: string;
}

export interface Scan {
  id: string;
  name: string;
  target: string;
  mode: ScanMode;
  scope: ScanScope;
  status: ScanStatus;
  tests: { sqli: boolean; xss: boolean };
  engine: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  pagesTested: number;
  parametersTested: number;
  checks: ScanCheck[];
  findings: Finding[];
  error?: string;
  authorizationConfirmed?: boolean;
  ownerId?: string;
}

export interface ScanRequest {
  name: string;
  target: string;
  mode: ScanMode;
  scope: ScanScope;
  sqli: boolean;
  xss: boolean;
  authorizationConfirmed?: boolean;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  provider: "supabase" | "demo";
}

export interface AppSettings {
  scanTimeoutMs: number;
  defaultScope: ScanScope;
  reportIncludeEvidence: boolean;
  reportIncludeRemediation: boolean;
  reportFormat: "pdf" | "json";
}

export const DEFAULT_SETTINGS: AppSettings = {
  scanTimeoutMs: 300_000,
  defaultScope: "full",
  reportIncludeEvidence: true,
  reportIncludeRemediation: true,
  reportFormat: "pdf",
};

export interface IntegrationStatus {
  demoLab: { available: true };
  supabase: { configured: boolean };
  zap: { configured: boolean; message: string };
  authorizedDomains: string[];
  persistence: "supabase" | "local";
}
