/**
 * Optional OWASP ZAP integration. Server-side only: the API key is read from
 * process.env and is never returned to the browser.
 */

import type { Finding, Severity } from "./types";
import { XSS_REFERENCES, XSS_REMEDIATION, SQLI_REFERENCES, SQLI_REMEDIATION } from "./severity";

export interface ZapConfig {
  configured: boolean;
  apiUrl: string | null;
  apiKey: string | null;
  timeoutMs: number;
}

export function getZapConfig(): ZapConfig {
  const apiUrl = (process.env.ZAP_API_URL ?? "").trim().replace(/\/$/, "");
  const apiKey = (process.env.ZAP_API_KEY ?? "").trim();
  const timeoutMs = Number.parseInt(process.env.ZAP_SCAN_TIMEOUT_MS ?? "900000", 10);
  const configured = Boolean(apiUrl && apiKey && /^https?:\/\//.test(apiUrl));
  return {
    configured,
    apiUrl: configured ? apiUrl : null,
    apiKey: configured ? apiKey : null,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 900_000,
  };
}

function zapUrl(config: ZapConfig, path: string, params: Record<string, string | number> = {}) {
  if (!config.apiUrl || !config.apiKey) throw new Error("ZAP is not configured");
  const url = new URL(`${config.apiUrl}${path}`);
  url.searchParams.set("apikey", config.apiKey);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  return url;
}

async function zapRequest<T>(
  config: ZapConfig,
  path: string,
  params?: Record<string, string | number>,
  timeoutMs = 15_000,
): Promise<T> {
  const url = zapUrl(config, path, params);
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`ZAP request failed with HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function getZapVersion(config = getZapConfig()) {
  if (!config.configured) return null;
  try {
    const data = await zapRequest<{ version: string }>(config, "/JSON/core/view/version/");
    return data.version;
  } catch {
    return null;
  }
}

export async function startZapSpider(config: ZapConfig, target: string) {
  return zapRequest<{ scan: string }>(config, "/JSON/spider/action/scan/", {
    url: target,
    recurse: "true",
    subtreeOnly: "true",
  });
}

export async function startZapActiveScan(config: ZapConfig, target: string) {
  return zapRequest<{ scan: string }>(config, "/JSON/ascan/action/scan/", {
    url: target,
    recurse: "true",
    inScopeOnly: "true",
  });
}

export async function getZapSpiderStatus(config: ZapConfig, scanId: string) {
  const data = await zapRequest<{ status: string }>(config, "/JSON/spider/view/status/", {
    scanId,
  });
  return Number.parseInt(data.status, 10) || 0;
}

export async function getZapActiveScanStatus(config: ZapConfig, scanId: string) {
  const data = await zapRequest<{ status: string }>(config, "/JSON/ascan/view/status/", {
    scanId,
  });
  return Number.parseInt(data.status, 10) || 0;
}

export interface ZapAlert {
  id?: string;
  alert?: string;
  name?: string;
  risk?: string;
  confidence?: string;
  url?: string;
  param?: string;
  attack?: string;
  evidence?: string;
  description?: string;
  solution?: string;
  cweid?: string;
  pluginId?: string;
}

export async function getZapAlerts(config: ZapConfig, baseUrl: string) {
  const data = await zapRequest<{ alerts: ZapAlert[] }>(config, "/JSON/core/view/alerts/", {
    baseurl: baseUrl,
    start: 0,
    count: 500,
  });
  return data.alerts ?? [];
}

const DEFAULT_REFS = ["https://www.zaproxy.org/docs/"];

export function classifyZapAlert(
  alert: ZapAlert,
  scanId: string,
  index: number,
): Finding | null {
  const name = `${alert.alert ?? alert.name ?? ""}`.toLowerCase();
  const cwe = `${alert.cweid ?? ""}`;
  const isSqli = cwe === "89" || name.includes("sql injection");
  const isXss = cwe === "79" || name.includes("cross site scripting") || name.includes("xss");
  if (!isSqli && !isXss) return null;

  const risk = `${alert.risk ?? ""}`.toLowerCase();
  let severity: Severity = "low";
  if (risk.includes("high")) severity = "high";
  else if (risk.includes("medium")) severity = "medium";
  else if (risk.includes("low")) severity = "low";
  else if (risk.includes("informational")) severity = "informational";

  const conf = `${alert.confidence ?? ""}`.toLowerCase();
  const confidence: Finding["confidence"] = conf.includes("high")
    ? "high"
    : conf.includes("medium")
      ? "medium"
      : "low";

  const url = alert.url ?? "";
  const parameter = alert.param ?? "";

  return {
    id: `f_${scanId}_zap_${index + 1}`,
    scanId,
    type: isSqli ? "sqli" : "xss",
    category: isSqli ? "sql-injection" : name.includes("dom") ? "dom-xss" : "reflected-xss",
    title: alert.alert ?? alert.name ?? (isSqli ? "SQL Injection" : "Cross-Site Scripting"),
    description:
      alert.description ??
      "OWASP ZAP reported this alert. It has not been manually validated by a security professional.",
    url,
    method: "GET",
    parameter,
    severity,
    confidence,
    verification: "unverified",
    verificationMethod: "zap-alert",
    detectedAt: new Date().toISOString(),
    evidence: {
      payload: alert.attack ?? "",
      request: `${url}${parameter ? ` (parameter: ${parameter})` : ""}`,
      responseSnippet: alert.evidence ?? "",
      analysis:
        "Reported by OWASP ZAP as an automated scanner alert. The alert has not been manually reproduced or confirmed. Verify before treating it as a confirmed vulnerability.",
      simulated: false,
    },
    risk:
      isSqli
        ? "If confirmed, an attacker could alter database queries and access data beyond their authorization."
        : "If confirmed, an attacker could execute script in a victim's browser session.",
    remediation: isSqli ? SQLI_REMEDIATION : XSS_REMEDIATION,
    references: isSqli ? SQLI_REFERENCES : XSS_REFERENCES.concat(DEFAULT_REFS),
    source: "zap",
  };
}
