"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  FileSearch,
  Layers,
  ScanLine,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { FindingsByTypeChart, ScanActivityChart, SeverityChart } from "@/components/charts";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { summarizeFindings } from "@/lib/severity";
import { listScans } from "@/lib/storage";
import type { Scan } from "@/lib/types";
import { formatDateShort, formatDateTime, formatDuration, truncate } from "@/lib/utils";

export default function DashboardPage() {
  const { user } = useAuth();
  const [scans, setScans] = React.useState<Scan[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    listScans()
      .then((result) => {
        if (active) setScans(result);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const findings = React.useMemo(() => scans.flatMap((scan) => scan.findings), [scans]);
  const summary = React.useMemo(() => summarizeFindings(findings), [findings]);
  const pagesDiscovered = scans.reduce((total, scan) => total + scan.pagesTested, 0);
  const recent = scans.slice(0, 5);

  const activity = React.useMemo(() => {
    const days: { date: string; scans: number; findings: number }[] = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - offset);
      const key = day.toISOString().slice(0, 10);
      days.push({
        date: formatDateShort(day.toISOString()),
        scans: scans.filter((scan) => scan.startedAt.slice(0, 10) === key).length,
        findings: findings.filter((finding) => finding.detectedAt.slice(0, 10) === key).length,
      });
    }
    return days;
  }, [scans, findings]);

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title={`Welcome back${user?.name ? `, ${user.name}` : ""}`}
        description="Security testing metrics calculated from the scan history stored for this session."
        actions={
          <Link href="/scan/new">
            <Button>
              <ScanLine />
              Start New Scan
            </Button>
          </Link>
        }
      />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-lg border border-line bg-surface" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total scans" value={scans.length} icon={Activity} hint="All stored scan runs" />
            <StatCard
              label="Pages discovered"
              value={pagesDiscovered}
              icon={Layers}
              hint="Distinct pages/endpoints tested"
            />
            <StatCard
              label="SQL injection findings"
              value={summary.sqli}
              icon={FileSearch}
              tone="accent"
              hint="Across all stored scans"
            />
            <StatCard
              label="XSS findings"
              value={summary.xss}
              icon={ShieldAlert}
              tone="warn"
              hint="Reflected, stored and DOM"
            />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Critical" value={summary.bySeverity.critical} tone="danger" icon={ShieldAlert} />
            <StatCard label="High" value={summary.bySeverity.high} tone="warn" />
            <StatCard label="Medium" value={summary.bySeverity.medium} tone="accent" />
            <StatCard label="Low" value={summary.bySeverity.low} />
          </div>

          {scans.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="No scans stored yet"
                description="All dashboard metrics are derived from real stored scan results. Run the Safe Demo Lab to populate this dashboard with clearly labelled simulated findings."
                icon={ScanLine}
                action={
                  <Link href="/scan/new">
                    <Button>
                      Run the Safe Demo Lab
                      <ArrowRight />
                    </Button>
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>SQLi vs XSS findings</CardTitle>
                  <CardDescription>Findings grouped by vulnerability class.</CardDescription>
                </CardHeader>
                <CardContent>
                  <FindingsByTypeChart sqli={summary.sqli} xss={summary.xss} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Severity distribution</CardTitle>
                  <CardDescription>Classification based on recorded evidence.</CardDescription>
                </CardHeader>
                <CardContent>
                  <SeverityChart counts={summary.bySeverity} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Scan activity (7 days)</CardTitle>
                  <CardDescription>Scans started and findings detected per day.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScanActivityChart data={activity} />
                </CardContent>
              </Card>
            </div>
          )}

          <Card className="mt-6">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Recent scan activity</CardTitle>
                <CardDescription>Latest scan runs, most recent first.</CardDescription>
              </div>
              <Link href="/scans" className="text-xs font-medium text-accent hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {recent.length === 0 ? (
                <p className="px-5 py-8 text-center text-xs text-muted">No scan activity recorded yet.</p>
              ) : (
                <Table>
                  <THead>
                    <tr>
                      <TH>Scan</TH>
                      <TH>Target</TH>
                      <TH>Status</TH>
                      <TH>Findings</TH>
                      <TH>Duration</TH>
                      <TH>Started</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {recent.map((scan) => (
                      <TR key={scan.id}>
                        <TD>
                          <Link
                            href={`/scans/${scan.id}`}
                            className="font-medium text-navy underline-offset-4 hover:text-accent hover:underline"
                          >
                            {scan.name}
                          </Link>
                        </TD>
                        <TD className="max-w-[240px] truncate text-xs text-muted" title={scan.target}>
                          {truncate(scan.target, 48)}
                        </TD>
                        <TD>
                          <StatusBadge status={scan.status} />
                        </TD>
                        <TD className="whitespace-nowrap text-xs">
                          {scan.findings.filter((finding) => finding.type === "sqli").length} SQLi ·{" "}
                          {scan.findings.filter((finding) => finding.type === "xss").length} XSS
                        </TD>
                        <TD className="whitespace-nowrap text-xs text-muted">
                          {formatDuration(scan.durationMs)}
                        </TD>
                        <TD className="whitespace-nowrap text-xs text-muted">
                          {formatDateTime(scan.startedAt)}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <p className="mt-4 text-[11px] leading-relaxed text-muted">
            Metrics are calculated from this account&apos;s stored scans. Demo-lab findings are
            simulated. Verified and unverified scanner alerts are counted separately on the
            vulnerabilities page.
          </p>
        </>
      )}
    </div>
  );
}
