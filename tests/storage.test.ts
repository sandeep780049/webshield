import { describe, expect, it } from "vitest";
import {
  deleteScan,
  getScan,
  listScans,
  readDemoSession,
  readSettings,
  saveScan,
  updateScanStatus,
  writeSettings,
} from "@/lib/storage";
import { runDemoScan } from "@/lib/scanner/engine";
import { DEFAULT_SETTINGS } from "@/lib/types";

describe("scan history persistence (local demo mode)", () => {
  it("saves, retrieves and deletes scans", async () => {
    const scan = runDemoScan({ name: "Persisted scan", sqli: true, xss: true });
    await saveScan(scan);

    const retrieved = await getScan(scan.id);
    expect(retrieved?.id).toBe(scan.id);
    expect(retrieved?.findings.length).toBe(scan.findings.length);

    const all = await listScans();
    expect(all.some((item) => item.id === scan.id)).toBe(true);

    await updateScanStatus(scan.id, "completed");
    expect((await getScan(scan.id))?.status).toBe("completed");

    await deleteScan(scan.id);
    expect(await getScan(scan.id)).toBeNull();
  });

  it("returns scans newest first", async () => {
    const older = runDemoScan({ name: "Older" });
    const newer = runDemoScan({ name: "Newer" });
    await saveScan({ ...older, startedAt: new Date(Date.now() - 60_000).toISOString() });
    await saveScan({ ...newer, startedAt: new Date().toISOString() });
    const scans = await listScans();
    expect(scans[0].name).toBe("Newer");
  });
});

describe("settings and demo session", () => {
  it("round-trips settings", () => {
    const settings = { ...DEFAULT_SETTINGS, scanTimeoutMs: 120000, reportFormat: "json" as const };
    writeSettings(settings);
    expect(readSettings()).toEqual(settings);
  });

  it("returns defaults when nothing is stored", () => {
    expect(readSettings()).toEqual(DEFAULT_SETTINGS);
    expect(readDemoSession()).toBeNull();
  });
});
