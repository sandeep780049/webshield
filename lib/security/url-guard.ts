/**
 * Server-side SSRF and abuse protections for external scans.
 *
 * Only explicitly allowlisted domains are accepted, every resolved address must
 * be public, credentials in URLs are rejected, and redirects are re-validated
 * hop by hop.
 */

import { promises as dns } from "node:dns";
import net from "node:net";

export class ScanValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ScanValidationError";
    this.status = status;
  }
}

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata",
  "metadata.google.internal",
  "instance-data",
  "169.254.169.254",
  "fd00:ec2::254",
]);

const MULTICAST_OR_RESERVED = new Set(["0.0.0.0", "255.255.255.255"]);

function ipv4ToOctets(address: string): number[] | null {
  if (!net.isIPv4(address)) return null;
  return address.split(".").map((part) => Number.parseInt(part, 10));
}

export function isPrivateIp(address: string): boolean {
  if (net.isIPv6(address)) {
    const normalized = address.toLowerCase();
    if (normalized === "::" || normalized === "::1") return true;
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
    if (normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) {
      return true;
    }
    const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    return false;
  }

  const octets = ipv4ToOctets(address);
  // Not an IP literal: hostnames are handled by BLOCKED_HOSTNAMES and DNS checks.
  if (!octets) return false;
  const [a, b] = octets;
  if (MULTICAST_OR_RESERVED.has(address)) return true;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
}

export function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/\.$/, "");
}

export function parseAllowedDomains(raw = process.env.AUTHORIZED_SCAN_DOMAINS ?? "") {
  return raw
    .split(",")
    .map(normalizeDomain)
    .filter(Boolean);
}

export function isDomainAllowed(hostname: string, allowed: string[]) {
  const host = normalizeDomain(hostname);
  return allowed.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export interface ValidatedTarget {
  url: URL;
  hostname: string;
  addresses: string[];
}

export async function validateExternalTarget(
  rawUrl: string,
  allowedDomains = parseAllowedDomains(),
): Promise<ValidatedTarget> {
  if (!rawUrl || typeof rawUrl !== "string") {
    throw new ScanValidationError("A target URL is required.");
  }
  if (rawUrl.length > 2048) {
    throw new ScanValidationError("Target URL is too long.");
  }

  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new ScanValidationError("Enter a valid absolute URL, for example https://staging.example.com.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ScanValidationError("Only http:// and https:// targets are supported.");
  }
  if (url.username || url.password) {
    throw new ScanValidationError("Target URLs must not contain embedded credentials.");
  }
  if (url.port && !["80", "443", "8080", "8443"].includes(url.port)) {
    throw new ScanValidationError(`Port ${url.port} is not permitted for external scans.`);
  }

  const hostname = normalizeDomain(url.hostname.replace(/^\[|\]$/g, ""));
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new ScanValidationError("Localhost, link-local and cloud metadata hosts are blocked.");
  }
  if (isPrivateIp(hostname)) {
    throw new ScanValidationError("Private, loopback, link-local and reserved IP addresses are blocked.");
  }
  if (!hostname.includes(".")) {
    throw new ScanValidationError("Target must be a fully qualified public hostname.");
  }

  if (allowedDomains.length === 0) {
    throw new ScanValidationError(
      "No authorized target domains are configured. Set AUTHORIZED_SCAN_DOMAINS on the server before running external scans.",
      403,
    );
  }
  if (!isDomainAllowed(hostname, allowedDomains)) {
    throw new ScanValidationError(
      `Host "${hostname}" is not in the authorized target allowlist.`,
      403,
    );
  }

  let records: { address: string; family: number }[];
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new ScanValidationError(`Could not resolve ${hostname}.`, 400);
  }
  if (records.length === 0) {
    throw new ScanValidationError(`Could not resolve ${hostname}.`, 400);
  }
  const addresses = records.map((record) => record.address);
  if (addresses.some(isPrivateIp)) {
    throw new ScanValidationError(
      "The target resolves to a private or reserved address and cannot be scanned.",
      403,
    );
  }

  return { url, hostname, addresses };
}

const MAX_REDIRECTS = 3;
const MAX_BODY_BYTES = 512 * 1024;

export async function safeExternalFetch(
  target: URL,
  init: RequestInit & { timeoutMs?: number } = {},
  allowedDomains = parseAllowedDomains(),
): Promise<Response> {
  let current = target;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await validateExternalTarget(current.toString(), allowedDomains);
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      Math.min(Math.max(init.timeoutMs ?? 15_000, 1_000), 30_000),
    );
    try {
      const response = await fetch(current, {
        ...init,
        redirect: "manual",
        signal: controller.signal,
        headers: {
          ...(init.headers ?? {}),
          "User-Agent": "WebShield/1.0 (authorized security testing)",
        },
      });
      const contentLength = Number(response.headers.get("content-length") ?? "0");
      if (contentLength > MAX_BODY_BYTES) {
        throw new ScanValidationError("Target response exceeded the permitted size.", 502);
      }
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) return response;
        current = new URL(location, current);
        continue;
      }
      return response;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new ScanValidationError("Target redirected too many times.", 502);
}
