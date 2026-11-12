"use client";

import * as React from "react";
import {
  CheckCircle2,
  Database,
  FlaskConical,
  HardDrive,
  Info,
  Loader2,
  Lock,
  PlugZap,
  Save,
  User,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { readSettings, writeSettings } from "@/lib/storage";
import type { AppSettings, IntegrationStatus, ScanScope } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export default function SettingsPage() {
  const { user, cloudEnabled } = useAuth();
  const [settings, setSettings] = React.useState<AppSettings | null>(null);
  const [status, setStatus] = React.useState<IntegrationStatus | null>(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    setSettings(readSettings());
    let active = true;
    fetch("/api/integrations/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: IntegrationStatus) => {
        if (active) setStatus(data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const patch = (partial: Partial<AppSettings>) => {
    setSettings((current) => (current ? { ...current, ...partial } : current));
    setSaved(false);
  };

  const save = () => {
    if (!settings) return;
    writeSettings(settings);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Profile, integration status, scan preferences and report options."
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <User className="h-4 w-4 text-accent" />
                Profile
              </CardTitle>
              <CardDescription>Identity for this session.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Name</p>
                <p className="mt-1 text-[13px] text-ink">{user?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Email</p>
                <p className="mt-1 break-all text-[13px] text-ink">{user?.email ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Authentication
                </p>
                <Badge className="mt-1 border-[#cfdff0] bg-[#eef4fa] text-[#2d5b86]">
                  {user?.provider === "supabase" ? "Supabase account" : "Local demo session"}
                </Badge>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Persistence
                </p>
                <Badge className="mt-1">
                  {status?.persistence === "supabase" ? "Supabase cloud" : "Browser local storage"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <Database className="h-4 w-4 text-accent" />
                Scan preferences
              </CardTitle>
              <CardDescription>
                Applied to new scans. These preferences are stored locally.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Scan timeout (ms)"
                  htmlFor="scan-timeout"
                  hint="Used for external scan polling. Minimum 30,000 ms."
                >
                  <Input
                    id="scan-timeout"
                    type="number"
                    min={30000}
                    step={1000}
                    value={settings?.scanTimeoutMs ?? 300000}
                    onChange={(event) =>
                      patch({ scanTimeoutMs: Number.parseInt(event.target.value, 10) || 300000 })
                    }
                  />
                </Field>
                <Field label="Default scan scope" htmlFor="default-scope">
                  <Select
                    id="default-scope"
                    value={settings?.defaultScope ?? "full"}
                    onChange={(event) => patch({ defaultScope: event.target.value as ScanScope })}
                  >
                    <option value="full">Full — all fixtures/pages</option>
                    <option value="single-page">Single page</option>
                    <option value="parameters-only">Parameters only</option>
                  </Select>
                </Field>
              </div>

              <div className="space-y-3 border-t border-line pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Report preferences
                </p>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-medium text-navy">Include evidence in reports</p>
                    <p className="text-[11px] text-muted">Payloads, requests and response observations.</p>
                  </div>
                  <Switch
                    checked={settings?.reportIncludeEvidence ?? true}
                    onCheckedChange={(checked) => patch({ reportIncludeEvidence: checked })}
                    label="Include evidence in reports"
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-medium text-navy">Include remediation guidance</p>
                    <p className="text-[11px] text-muted">Detailed fix instructions for each finding.</p>
                  </div>
                  <Switch
                    checked={settings?.reportIncludeRemediation ?? true}
                    onCheckedChange={(checked) => patch({ reportIncludeRemediation: checked })}
                    label="Include remediation guidance"
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-medium text-navy">Default export format</p>
                    <p className="text-[11px] text-muted">Used as the preferred download option.</p>
                  </div>
                  <Select
                    aria-label="Default export format"
                    className="w-32"
                    value={settings?.reportFormat ?? "pdf"}
                    onChange={(event) =>
                      patch({ reportFormat: event.target.value === "json" ? "json" : "pdf" })
                    }
                  >
                    <option value="pdf">PDF</option>
                    <option value="json">JSON</option>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-3 border-t border-line pt-3">
                <Button onClick={save} disabled={!settings}>
                  <Save />
                  Save preferences
                </Button>
                {saved ? (
                  <span className="inline-flex items-center gap-1 text-xs text-[#24603b]" role="status">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Preferences saved
                  </span>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <FlaskConical className="h-4 w-4 text-accent" />
                Demo mode
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-[11.5px] leading-relaxed text-muted">
              <div className="flex items-center justify-between">
                <span>Safe Demo Lab</span>
                <Badge className="border-[#c8e3d1] bg-[#edf6f0] text-[#24603b]">Always available</Badge>
              </div>
              <p>
                Deterministic SQLi and XSS fixtures run entirely on the server. No external service,
                API key or paid scanner is required.
              </p>
              <div className="flex items-center justify-between border-t border-line pt-2">
                <span>Local demo session</span>
                <Badge
                  className={
                    cloudEnabled
                      ? "border-[#cfdff0] bg-[#eef4fa] text-[#2d5b86]"
                      : "border-[#ecdfb5] bg-[#fdf8e6] text-[#8a6a10]"
                  }
                >
                  {cloudEnabled ? "Available as fallback" : "Active"}
                </Badge>
              </div>
              <p>
                {cloudEnabled
                  ? "Supabase is configured. Accounts and scan history can use the cloud; demo mode remains available."
                  : "Supabase is not configured. Accounts and persistence use this browser only, and the UI labels this clearly."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <PlugZap className="h-4 w-4 text-accent" />
                OWASP ZAP integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-[11.5px] leading-relaxed text-muted">
              <div className="flex items-center justify-between">
                <span>Status</span>
                <Badge
                  className={
                    status?.zap.configured
                      ? "border-[#c8e3d1] bg-[#edf6f0] text-[#24603b]"
                      : "border-[#ecdfb5] bg-[#fdf8e6] text-[#8a6a10]"
                  }
                >
                  {status?.zap.configured ? "Configured" : "Not configured"}
                </Badge>
              </div>
              <p>{status?.zap.message ?? "Checking integration status…"}</p>
              <div className="rounded-md border border-line bg-[#f7f9fb] p-2.5 text-[10.5px] leading-relaxed">
                <p className="font-medium text-navy">Server-side environment variables</p>
                <p className="mt-1 font-mono">ZAP_API_URL</p>
                <p className="font-mono">ZAP_API_KEY</p>
                <p className="font-mono">AUTHORIZED_SCAN_DOMAINS</p>
                <p className="mt-1.5">
                  Configure these in your deployment environment. The API key is never sent to the
                  browser.
                </p>
              </div>
              <div className="flex items-start gap-1.5 text-[10.5px]">
                <Lock className="mt-0.5 h-3 w-3 shrink-0" />
                External scanning stays disabled when ZAP is not configured. The Safe Demo Lab is
                unaffected.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <HardDrive className="h-4 w-4 text-accent" />
                Authorized targets
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-[11px] leading-relaxed text-muted">
              {status && status.authorizedDomains.length > 0 ? (
                <ul className="space-y-1">
                  {status.authorizedDomains.map((domain) => (
                    <li key={domain} className="rounded border border-line bg-[#f9fbfc] px-2 py-1 font-mono text-[10.5px]">
                      {domain}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No authorized domains configured. External scans are rejected.</p>
              )}
              <p>
                Localhost, private ranges, link-local addresses and cloud metadata endpoints are
                blocked regardless of the allowlist.
              </p>
              <p className="flex items-start gap-1.5">
                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                Only scan systems you own or are explicitly authorized to test.
              </p>
            </CardContent>
          </Card>

          {status ? (
            <p className="text-[10px] text-muted">
              Integration status checked at {formatDateTime(new Date().toISOString())}.
            </p>
          ) : null}
        </div>
      </div>

      {!status ? (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted" role="status">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading integration status…
        </div>
      ) : null}
    </div>
  );
}
