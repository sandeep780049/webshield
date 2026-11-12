import type { AppSettings, Scan, ScanStatus, SessionUser } from "./types";
import { DEFAULT_SETTINGS } from "./types";
import { getSupabaseClient, isSupabaseConfigured } from "./supabase/client";

export const SCAN_KEY = "webshield.scans.v1";
export const SETTINGS_KEY = "webshield.settings.v1";
export const DEMO_SESSION_KEY = "webshield.demo-session.v1";

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function readLocalScans(): Scan[] {
  const scans = readJson<Scan[]>(SCAN_KEY, []);
  return Array.isArray(scans) ? scans.filter(isScanLike) : [];
}

function isScanLike(value: unknown): value is Scan {
  if (!value || typeof value !== "object") return false;
  const scan = value as Partial<Scan>;
  return typeof scan.id === "string" && typeof scan.name === "string" && Array.isArray(scan.findings);
}

function sortScans(scans: Scan[]) {
  return [...scans].sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
}

export function writeLocalScans(scans: Scan[]) {
  writeJson(SCAN_KEY, scans);
}

export function upsertLocalScan(scan: Scan) {
  const scans = readLocalScans();
  const next = scans.filter((item) => item.id !== scan.id);
  next.unshift(scan);
  writeLocalScans(next);
}

export function deleteLocalScan(id: string) {
  writeLocalScans(readLocalScans().filter((scan) => scan.id !== id));
}

export function readSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS, ...readJson<Partial<AppSettings>>(SETTINGS_KEY, {}) };
}

export function writeSettings(settings: AppSettings) {
  writeJson(SETTINGS_KEY, settings);
}

export function readDemoSession(): SessionUser | null {
  const session = readJson<SessionUser | null>(DEMO_SESSION_KEY, null);
  return session && session.id ? session : null;
}

export function writeDemoSession(user: SessionUser) {
  writeJson(DEMO_SESSION_KEY, user);
}

export function clearDemoSession() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(DEMO_SESSION_KEY);
}

async function currentCloudUser() {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/**
 * Reads scan history. Cloud history is used when Supabase is configured and a
 * user is signed in; otherwise (or on failure) the local mirror is returned.
 */
export async function listScans(): Promise<Scan[]> {
  const user = await currentCloudUser();
  if (user) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("scans")
        .select("payload")
        .order("started_at", { ascending: false });
      if (!error && data) {
        return data
          .map((row) => (row as { payload: Scan }).payload)
          .filter(isScanLike);
      }
    }
  }
  return sortScans(readLocalScans());
}

export async function saveScan(scan: Scan): Promise<Scan> {
  upsertLocalScan(scan);
  const user = await currentCloudUser();
  if (user) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from("scans").upsert({
        id: scan.id,
        user_id: user.id,
        name: scan.name,
        target: scan.target,
        mode: scan.mode,
        status: scan.status,
        started_at: scan.startedAt,
        completed_at: scan.completedAt ?? null,
        duration_ms: scan.durationMs ?? null,
        sqli_count: scan.findings.filter((finding) => finding.type === "sqli").length,
        xss_count: scan.findings.filter((finding) => finding.type === "xss").length,
        payload: scan,
      });
      if (error) {
        console.warn("Cloud save failed; scan retained locally.", error.message);
      }
    }
  }
  return scan;
}

export async function deleteScan(id: string): Promise<void> {
  deleteLocalScan(id);
  const user = await currentCloudUser();
  if (user) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from("scans").delete().eq("id", id);
      if (error) console.warn("Cloud delete failed; local copy removed.", error.message);
    }
  }
}

export async function getScan(id: string): Promise<Scan | null> {
  const scans = await listScans();
  return scans.find((scan) => scan.id === id) ?? null;
}

export async function updateScanStatus(id: string, status: ScanStatus) {
  const scans = await listScans();
  const scan = scans.find((item) => item.id === id);
  if (!scan) return;
  await saveScan({ ...scan, status });
}
