"use client";

import * as React from "react";
import Link from "next/link";
import { FileJson, FileText, Info, Radar, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { downloadJsonReport, downloadPdfReport } from "@/lib/reports";
import { SCAN_DISCLAIMER, summarizeFindings } from "@/lib/severity";
import { listScans, readSettings } from "@/lib/storage";
import type { Scan } from "@/lib/types";
import { formatDateTime, truncate } from "@/lib/utils";

export default function ReportsPage() {
  const [scans, setScans] = React.useState<Scan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    listScans()
      .then((result) => {
        if (active) setScans(result);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const download = async (scan: Scan, format: "pdf" | "json") => {
    setBusy(`${scan.id}:${format}`);
    try {
      const settings = readSettings();
      const options = {
        includeEvidence: settings.reportIncludeEvidence,
        includeRemediation: settings.reportIncludeRemediation,
      };
      if (format === "pdf") await downloadPdfReport(scan, options);
      else downloadJsonReport(scan, options);
    } catch (error) {
      console.error("Report generation failed", error);
    } finally {
      setBusy(null);
    }
  };

  const completed = scans.filter((scan) => scan.status === "completed");

  return (
    <div>
      <PageHeader
        eyebrow="Reports"
        title="Reports"
        description="Download scan results as PDF or JSON. Reports are generated from the stored scan record for this session."
      />

      <Card className="mb-4 border-[#cfdff0] bg-accent-soft">
        <CardContent className="flex items-start gap-3 py-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#2d5b86]" />
          <div className="text-[11.5px] leading-relaxed text-[#2d4f70]">
            <p className="font-medium">Every report includes scan metadata, findings, evidence, coverage and limitations.</p>
            <p className="mt-1">{SCAN_DISCLAIMER}</p>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="h-40 animate-pulse rounded-lg border border-line bg-surface" aria-busy="true" />
      ) : completed.length === 0 ? (
        <EmptyState
          title="No completed scans to report"
          description="Run a scan to generate a PDF or JSON report. The Safe Demo Lab produces a complete, reportable scan without any external service."
          icon={FileText}
          action={
            <Link href="/scan/new">
              <Button>
                <Radar />
                Run a scan
              </Button>
            </Link>
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Available reports</CardTitle>
            <CardDescription>{completed.length} completed scan(s) with stored results.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <THead>
                <tr>
                  <TH>Scan</TH>
                  <TH>Target</TH>
                  <TH>Date</TH>
                  <TH>Status</TH>
                  <TH>Findings</TH>
                  <TH className="text-right">Download</TH>
                </tr>
              </THead>
              <TBody>
                {completed.map((scan) => {
                  const summary = summarizeFindings(scan.findings);
                  return (
                    <TR key={scan.id}>
                      <TD>
                        <Link
                          href={`/scans/${scan.id}`}
                          className="font-medium text-navy underline-offset-4 hover:text-accent hover:underline"
                        >
                          {scan.name}
                        </Link>
                        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted">
                          {scan.mode === "demo" ? "Safe Demo Lab" : "External ZAP"}
                        </p>
                      </TD>
                      <TD className="max-w-[200px] truncate text-xs text-muted" title={scan.target}>
                        {truncate(scan.target, 40)}
                      </TD>
                      <TD className="whitespace-nowrap text-xs text-muted">
                        {formatDateTime(scan.startedAt)}
                      </TD>
                      <TD>
                        <StatusBadge status={scan.status} />
                      </TD>
                      <TD className="whitespace-nowrap text-xs">
                        {summary.sqli} SQLi · {summary.xss} XSS
                      </TD>
                      <TD>
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy !== null}
                            onClick={() => download(scan, "pdf")}
                          >
                            <FileText />
                            {busy === `${scan.id}:pdf` ? "Preparing…" : "PDF"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy !== null}
                            onClick={() => download(scan, "json")}
                          >
                            <FileJson />
                            {busy === `${scan.id}:json` ? "Preparing…" : "JSON"}
                          </Button>
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-accent" />
              Report contents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-[11.5px] leading-relaxed text-muted">
              <li>WebShield project name, scan ID, target URL and scan date</li>
              <li>Scan mode, status, engine, pages and parameters tested</li>
              <li>SQLi and XSS findings with severity, confidence and verification</li>
              <li>Evidence, remediation guidance and reference links</li>
              <li>Coverage limitations and the required security disclaimer</li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Report preferences</CardTitle>
          </CardHeader>
          <CardContent className="text-[11.5px] leading-relaxed text-muted">
            <p>
              Evidence and remediation sections can be excluded from exports in Settings. Preferences
              are applied the next time a report is downloaded.
            </p>
            <Link
              href="/settings"
              className="mt-2 inline-block text-xs font-medium text-accent hover:underline"
            >
              Open report settings
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
