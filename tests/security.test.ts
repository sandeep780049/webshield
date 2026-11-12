import { describe, expect, it, vi } from "vitest";

const { lookup } = vi.hoisted(() => ({ lookup: vi.fn() }));

vi.mock("node:dns", () => ({
  default: { promises: { lookup } },
  promises: { lookup },
}));

import {
  ScanValidationError,
  isPrivateIp,
  validateExternalTarget,
} from "@/lib/security/url-guard";

const ALLOWED = ["example.com"];

function mockPublicDns() {
  lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
}

describe("SSRF address classification", () => {
  it("flags loopback, private, link-local and metadata ranges", () => {
    for (const address of [
      "127.0.0.1",
      "127.10.0.4",
      "10.1.2.3",
      "172.16.5.4",
      "192.168.0.10",
      "169.254.169.254",
      "100.100.100.200",
      "0.0.0.0",
      "224.0.0.1",
      "::1",
      "fd00::1",
      "fe80::1",
      "::ffff:127.0.0.1",
    ]) {
      expect(isPrivateIp(address), address).toBe(true);
    }
  });

  it("accepts public addresses", () => {
    expect(isPrivateIp("93.184.216.34")).toBe(false);
    expect(isPrivateIp("8.8.8.8")).toBe(false);
    expect(isPrivateIp("2606:2800:220:1:248:1893:25c8:1946")).toBe(false);
  });
});

describe("external target validation", () => {
  it("rejects localhost and loopback targets", async () => {
    await expect(validateExternalTarget("http://localhost/admin", ALLOWED)).rejects.toBeInstanceOf(
      ScanValidationError,
    );
    await expect(validateExternalTarget("http://127.0.0.1/", ALLOWED)).rejects.toThrow(/blocked/i);
    await expect(validateExternalTarget("http://[::1]/", ALLOWED)).rejects.toThrow(/blocked/i);
  });

  it("rejects cloud metadata addresses and private ranges", async () => {
    await expect(validateExternalTarget("http://169.254.169.254/latest/meta-data/", ALLOWED)).rejects.toThrow();
    await expect(validateExternalTarget("http://192.168.1.20/", ALLOWED)).rejects.toThrow();
    await expect(validateExternalTarget("http://10.0.0.5/", ALLOWED)).rejects.toThrow();
  });

  it("rejects invalid schemes, credentials and unusual ports", async () => {
    await expect(validateExternalTarget("not-a-url", ALLOWED)).rejects.toThrow(/valid absolute URL/i);
    await expect(validateExternalTarget("file:///etc/passwd", ALLOWED)).rejects.toThrow(/http/i);
    await expect(validateExternalTarget("ftp://example.com", ALLOWED)).rejects.toThrow(/http/i);
    await expect(validateExternalTarget("https://user:pass@example.com", ALLOWED)).rejects.toThrow(
      /credentials/i,
    );
    await expect(validateExternalTarget("https://example.com:22/", ALLOWED)).rejects.toThrow(/port/i);
  });

  it("requires a configured allowlist", async () => {
    await expect(validateExternalTarget("https://example.com", [])).rejects.toThrow(
      /No authorized target domains/i,
    );
  });

  it("rejects domains outside the allowlist", async () => {
    await expect(validateExternalTarget("https://evil.test", ALLOWED)).rejects.toThrow(/allowlist/i);
    await expect(validateExternalTarget("https://example.com.evil.test", ALLOWED)).rejects.toThrow(
      /allowlist/i,
    );
  });

  it("rejects allowlisted hosts that resolve to private addresses (DNS rebinding)", async () => {
    lookup.mockResolvedValue([{ address: "10.0.0.5", family: 4 }]);
    await expect(validateExternalTarget("https://example.com", ALLOWED)).rejects.toThrow(
      /private or reserved/i,
    );
  });

  it("accepts an allowlisted host that resolves publicly", async () => {
    mockPublicDns();
    const result = await validateExternalTarget("https://example.com/app", ALLOWED);
    expect(result.hostname).toBe("example.com");
    expect(result.addresses).toEqual(["93.184.216.34"]);
    expect(result.url.toString()).toBe("https://example.com/app");
  });
});
