"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FlaskConical,
  Info,
  Loader2,
  Radar,
  ShieldAlert,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { saveScan } from "@/lib/storage";
import type { IntegrationStatus, Scan, ScanMode, ScanScope } from "@/lib/types";

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function NewScanPage() {
  const router = useRouter();
  const [status, setStatus] = React.useState<IntegrationStatus | null>(null);
  const [name, setName] = React.useState("Safe Demo Lab scan");
  const [target, setTarget] = React.useState("");
  const [mode, setMode] = React.useState<ScanMode>("demo");
  const [scope, setScope] = React.useState<ScanScope>("full");
  const [sqli, setSqli] = React.useState(true);
  const [xss, setXss] = React.useState(true);
  const [authorized, setAuthorized] = React.useState(false);
  const [phase, setPhase] = React.useState<"idle" | "starting" | "running">("idle");
  const [progress, setProgress] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    fetch("/api/integrations/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: IntegrationStatus) => {
        if (active) {
          setStatus(data);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const zapConfigured = Boolean(status?.zap.configured);
  const busy = phase !== "idle";

  const switchMode = (next: ScanMode) => {
    if (next === "external" && !zapConfigured) return;
    setMode(next);
    setError(null);
    if (next === "demo") {
      setName((current) => (current === "Authorized external scan" ? "Safe Demo Lab scan" : current));
    } else {
      setName((current) => (current === "Safe Demo Lab scan" ? "Authorized external scan" : current));
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setProgress(null);

    if (!name.trim()) {
      setError("Give this scan a name.");
      return;
    }
    if (!sqli && !xss) {
      setError("Enable at least one test module (SQL Injection or XSS).");
      return;
    }
    if (mode === "external") {
      if (!zapConfigured) {
        setError("External scanner not configured. Use the Safe Demo Lab instead.");
        return;
      }
      if (!isHttpUrl(target.trim())) {
        setError("Enter a valid http:// or https:// target URL.");
        return;
      }
      if (!authorized) {
        setError("Confirm that you own the target or have explicit written authorization.");
        return;
      }
    }

    setPhase("starting");
    try {
      if (mode === "demo") {
        setProgress("Executing the deterministic Safe Demo Lab fixtures…");
        const response = await fetch("/api/scan/demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            target: target.trim() || undefined,
            scope,
            sqli,
            xss,
          }),
        });
        const data = (await response.json()) as { scan?: Scan; error?: string };
        if (!response.ok || !data.scan) {
          throw new Error(data.error ?? "The demo scan could not be completed.");
        }
        await saveScan(data.scan);
        setPhase("idle");
        router.push(`/scans/${data.scan.id}`);
        return;
      }

      setProgress("Validating the target and starting the external scan…");
      const response = await fetch("/api/scan/external", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          target: target.trim(),
          scope,
          sqli,
          xss,
          authorizationConfirmed: authorized,
        }),
      });
      const data = (await response.json()) as {
        scan?: Scan;
        error?: string;
        message?: string;
        progress?: { activeScan: number; spider: number };
      };
      if (!response.ok || !data.scan) {
        throw new Error(data.error ?? data.message ?? "The external scan could not be started.");
      }

      let current = data.scan;
      setPhase("running");
      setProgress("External scan running on ZAP. Waiting for results…");
      const startedAt = Date.now();

      while (current.status === "running" || current.status === "queued") {
        if (Date.now() - startedAt > 10 * 60 * 1000) {
          throw new Error("The scan is still running. Check Scan History later for its stored status.");
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const pollResponse = await fetch(`/api/scan/external?id=${encodeURIComponent(current.id)}`, {
          cache: "no-store",
        });
        const pollData = (await pollResponse.json()) as {
          scan?: Scan;
          error?: string;
          progress?: { activeScan: number; spider: number };
        };
        if (!pollResponse.ok || !pollData.scan) {
          throw new Error(pollData.error ?? "Could not retrieve external scan status.");
        }
        current = pollData.scan;
        if (pollData.progress) {
          setProgress(
            `External scan running — spider ${pollData.progress.spider}% · active scan ${pollData.progress.activeScan}%`,
          );
        }
      }

      await saveScan(current);
      setPhase("idle");
      router.push(`/scans/${current.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The scan failed.");
      setPhase("idle");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="New scan"
        title="Configure a scan"
        description="The Safe Demo Lab runs deterministic, isolated fixtures and needs no external services. External scans require a configured ZAP instance and an authorized target."
      />

      <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Target</CardTitle>
              <CardDescription>
                Demo scans never leave the server. External scans are checked server-side against
                the configured domain allowlist.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => switchMode("demo")}
                  aria-pressed={mode === "demo"}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    mode === "demo"
                      ? "border-accent bg-accent-soft"
                      : "border-line bg-surface hover:bg-[#f9fbfc]"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-navy">
                    <FlaskConical className="h-4 w-4 text-accent" />
                    Safe Demo Lab
                  </span>
                  <span className="mt-1 block text-[11px] leading-relaxed text-muted">
                    Built-in vulnerable and safe fixtures. Always available.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("external")}
                  aria-pressed={mode === "external"}
                  aria-disabled={!zapConfigured}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    mode === "external"
                      ? "border-accent bg-accent-soft"
                      : !zapConfigured
                        ? "cursor-not-allowed border-line bg-[#f7f8fa] opacity-70"
                        : "border-line bg-surface hover:bg-[#f9fbfc]"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-navy">
                    <Radar className="h-4 w-4 text-accent" />
                    Authorized external scan
                  </span>
                  <span className="mt-1 block text-[11px] leading-relaxed text-muted">
                    {zapConfigured
                      ? "Uses your separately hosted OWASP ZAP instance."
                      : "External scanner not configured."}
                  </span>
                </button>
              </div>

              <Field
                label="Scan name"
                htmlFor="scan-name"
                hint="Shown in scan history and reports."
              >
                <Input
                  id="scan-name"
                  value={name}
                  maxLength={120}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </Field>

              <Field
                label={mode === "demo" ? "Target label (optional)" : "Target URL"}
                htmlFor="target-url"
                hint={
                  mode === "demo"
                    ? "Optional. Demo findings always point to isolated webshield-demo fixtures."
                    : "Only domains in AUTHORIZED_SCAN_DOMAINS are accepted. Localhost, private ranges and cloud metadata addresses are blocked."
                }
              >
                <Input
                  id="target-url"
                  value={target}
                  onChange={(event) => setTarget(event.target.value)}
                  placeholder={
                    mode === "demo" ? "webshield-demo://safe-lab" : "https://staging.example.com"
                  }
                  required={mode === "external"}
                  inputMode="url"
                />
              </Field>

              {mode === "external" ? (
                <label className="flex items-start gap-2.5 rounded-md border border-[#ecdfb5] bg-[#fdf8e6] p-3 text-[11.5px] leading-relaxed text-[#6d540f]">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-[#2f5d8a]"
                    checked={authorized}
                    onChange={(event) => setAuthorized(event.target.checked)}
                  />
                  <span>
                    I confirm that I own this target or have explicit written authorization to test
                    it. I understand unauthorized scanning may be illegal.
                  </span>
                </label>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detection modules</CardTitle>
              <CardDescription>SQLi and XSS are implemented as separate modules.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start justify-between gap-4 rounded-md border border-line p-3">
                <div className="flex gap-3">
                  <Database className="mt-0.5 h-4 w-4 text-accent" />
                  <div>
                    <p className="text-[13px] font-medium text-navy">SQL Injection testing</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                      Error-based, boolean and time-based probes against database query fixtures.
                    </p>
                  </div>
                </div>
                <Switch checked={sqli} onCheckedChange={setSqli} label="Enable SQL injection testing" />
              </div>
              <div className="flex items-start justify-between gap-4 rounded-md border border-line p-3">
                <div className="flex gap-3">
                  <ShieldAlert className="mt-0.5 h-4 w-4 text-accent" />
                  <div>
                    <p className="text-[13px] font-medium text-navy">XSS testing</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                      Reflected, stored and DOM-based fixtures, plus safe output encoding controls.
                    </p>
                  </div>
                </div>
                <Switch checked={xss} onCheckedChange={setXss} label="Enable XSS testing" />
              </div>

              <Field label="Scan scope" htmlFor="scan-scope">
                <Select
                  id="scan-scope"
                  value={scope}
                  onChange={(event) => setScope(event.target.value as ScanScope)}
                >
                  <option value="full">Full — all demo-lab fixtures</option>
                  <option value="single-page">Single page — first fixture per module</option>
                  <option value="parameters-only">Parameters only — GET parameters</option>
                </Select>
              </Field>
            </CardContent>
          </Card>

          {error ? (
            <div className="flex items-start gap-2 rounded-md border border-[#f3c4c4] bg-[#fdecec] px-3 py-2.5 text-xs text-[#a32121]" role="alert">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          ) : null}

          {progress ? (
            <div className="flex items-start gap-2 rounded-md border border-[#cfdff0] bg-accent-soft px-3 py-2.5 text-xs text-[#2d5b86]" role="status">
              {busy ? (
                <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" />
              ) : (
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              )}
              {progress}
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={busy} size="lg">
              {busy ? <Loader2 className="animate-spin" /> : <Radar />}
              {busy ? "Scan in progress…" : "Start scan"}
            </Button>
            <p className="text-[11px] text-muted">
              Safe Demo Lab results are simulated and labelled accordingly.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>What will be tested</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-[12px]">
              <div>
                <p className="font-medium text-navy">SQL Injection</p>
                <ul className="mt-1 space-y-1 text-[11px] text-muted">
                  <li className="flex gap-1.5"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" /> Error signature probe</li>
                  <li className="flex gap-1.5"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" /> Boolean TRUE/FALSE differential</li>
                  <li className="flex gap-1.5"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" /> Time-based delay probe</li>
                  <li className="flex gap-1.5"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" /> Safe parameterized control</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-navy">Cross-Site Scripting</p>
                <ul className="mt-1 space-y-1 text-[11px] text-muted">
                  <li className="flex gap-1.5"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" /> Reflected XSS fixture</li>
                  <li className="flex gap-1.5"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" /> Stored XSS fixture</li>
                  <li className="flex gap-1.5"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" /> DOM sink analysis</li>
                  <li className="flex gap-1.5"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" /> HTML-encoded safe controls</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Integration status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-[11.5px]">
              <div className="flex items-center justify-between">
                <span className="text-muted">Safe Demo Lab</span>
                <Badge className="border-[#c8e3d1] bg-[#edf6f0] text-[#24603b]">Available</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">OWASP ZAP</span>
                <Badge
                  className={
                    zapConfigured
                      ? "border-[#c8e3d1] bg-[#edf6f0] text-[#24603b]"
                      : "border-[#ecdfb5] bg-[#fdf8e6] text-[#8a6a10]"
                  }
                >
                  {zapConfigured ? "Configured" : "Not configured"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Scan history</span>
                <Badge>{status?.persistence === "supabase" ? "Supabase" : "This browser"}</Badge>
              </div>
              {!zapConfigured ? (
                <p className="rounded-md border border-line bg-[#f7f9fb] px-2.5 py-2 text-[10.5px] leading-relaxed text-muted">
                  External scanning is disabled until ZAP_API_URL, ZAP_API_KEY and
                  AUTHORIZED_SCAN_DOMAINS are set on the server.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
