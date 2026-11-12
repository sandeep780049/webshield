"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileJson,
  FileText,
  ShieldAlert,
  Trash2,
  XCircle,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { FindingsTable } from "@/components/findings-table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge, TypeBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { downloadJsonReport, downloadPdfReport } from "@/lib/reports";
import { summarizeFindings } from "@/lib/severity";
import { deleteScan, getScan, readSettings } from "@/lib/storage";
import type { Scan } from "@/lib/types";
import { formatDateTime, formatDuration } from "@/lib/utils";

export default function ScanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [scan, setScan] = React.useState<Scan | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [downloading, setDownloading] = React.useState<"pdf" | "json" | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    getScan(String(params.id))
      .then((result) => {
        if (active) setScan(result);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [params.id]);

  const download = async (format: "pdf" | "json") => {
    if (!scan) return;
    setDownloading(format);
    try {
      const settings = readSettings();
      const options = {
        includeEvidence: settings.reportIncludeEvidence,
        includeRemediation: settings.reportIncludeRemediation,
      };
      if (format === "pdf") await downloadPdfReport(scan, options);
      else downloadJsonReport(scan, options);
    } finally {
      setDownloading(null);
    }
  };

  const removeScan = async () => {
    if (!scan) return;
    setDeleting(true);
    try {
      await deleteScan(scan.id);
      router.replace("/scans");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="h-64 animate-pulse rounded-lg border border-line bg-surface" aria-busy="true" />;
  }

  if (!scan) {
    return (
      <EmptyState
        title="Scan not found"
        description="This scan is not in the stored history for this session. It may have been deleted or created in another browser."
        icon={ShieldAlert}
        action={
          <Link href="/scans">
            <Button variant="outline">
              <ArrowLeft />
              Back to scan history
            </Button>
          </Link>
        }
      />
    );
  }

  const summary = summarizeFindings(scan.findings);
  const sqlCount = scan.findings.filter((finding) => finding.type === "sqli").length;
  const xssCount = scan.findings.filter((finding) => finding.type === "xss").length;
  const passed = scan.checks.filter((check) => check.result === "passed").length;

  return (
    <div>
      <PageHeader
        eyebrow="Scan report"
        title={scan.name}
        description={`${scan.mode === "demo" ? "Safe Demo Lab (simulated results)" : "Authorized external scan (OWASP ZAP)"} · ${scan.engine}`}
        actions={
          <>
            <Button variant="outline" onClick={() => download("json")} disabled={downloading !== null}>
              <FileJson />
              {downloading === "json" ? "Preparing…" : "JSON"}
            </Button>
            <Button variant="outline" onClick={() => download("pdf")} disabled={downloading !== null}>
              <FileText />
              {downloading === "pdf" ? "Preparing…" : "PDF"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete this scan"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4 text-[#a32121]" />
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="grid gap-x-6 gap-y-4 py-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Status</p>
            <div className="mt-1">
              <StatusBadge status={scan.status} />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Target</p>
            <p className="mt-1 break-all text-[12px] text-ink">{scan.target}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Started</p>
            <p className="mt-1 text-[12px] text-ink">{formatDateTime(scan.startedAt)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Duration</p>
            <p className="mt-1 text-[12px] text-ink">{formatDuration(scan.durationMs)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Pages tested</p>
            <p className="mt-1 text-[12px] text-ink">{scan.pagesTested}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Parameters tested</p>
            <p className="mt-1 text-[12px] text-ink">{scan.parametersTested}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Scope</p>
            <p className="mt-1 text-[12px] capitalize text-ink">{scan.scope.replace("-", " ")}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Scan ID</p>
            <p className="mt-1 break-all font-mono text-[10px] text-muted">{scan.id}</p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-muted">SQL Injection</p>
          <p className="mt-1 text-xl font-semibold text-navy">{sqlCount}</p>
        </Card>
        <Card className="px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-muted">XSS</p>
          <p className="mt-1 text-xl font-semibold text-navy">{xssCount}</p>
        </Card>
        <Card className="px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-muted">High / critical</p>
          <p className="mt-1 text-xl font-semibold text-navy">
            {summary.bySeverity.high + summary.bySeverity.critical}
          </p>
        </Card>
        <Card className="px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-muted">Checks passed</p>
          <p className="mt-1 text-xl font-semibold text-navy">{passed}</p>
        </Card>
      </div>

      {scan.error ? (
        <p className="mt-4 rounded-md border border-[#f3c4c4] bg-[#fdecec] px-3 py-2 text-xs text-[#a32121]">
          {scan.error}
        </p>
      ) : null}

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Findings</CardTitle>
          <CardDescription>
            {scan.mode === "demo"
              ? "Simulated Safe Demo Lab findings. Each finding links to full evidence and remediation."
              : "Automated scanner alerts. Confirm each alert manually before treating it as a vulnerability."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {scan.findings.length === 0 ? (
            <div className="flex items-center gap-3 px-5 py-8 text-sm text-muted">
              <CheckCircle2 className="h-4 w-4 text-[#24603b]" />
              No findings were recorded for this scan.
            </div>
          ) : (
            <FindingsTable findings={scan.findings} />
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Scan coverage and verification</CardTitle>
          <CardDescription>
            Every fixture or endpoint that was executed, including safe controls that produced no
            finding.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {scan.checks.length === 0 ? (
            <p className="px-5 py-6 text-xs text-muted">
              No individual checks are stored for this scan yet.
            </p>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Test</TH>
                  <TH>Module</TH>
                  <TH>Endpoint</TH>
                  <TH>Parameter</TH>
                  <TH>Result</TH>
                  <TH>Evidence summary</TH>
                </tr>
              </THead>
              <TBody>
                {scan.checks.map((check) => (
                  <TR key={check.id}>
                    <TD className="text-[12px] font-medium text-navy">{check.label}</TD>
                    <TD>
                      <TypeBadge type={check.type} />
                    </TD>
                    <TD className="font-mono text-[11px] text-muted">{check.path}</TD>
                    <TD className="font-mono text-[11px]">{check.parameter}</TD>
                    <TD>
                      {check.result === "finding" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#9a4a12]">
                          <XCircle className="h-3.5 w-3.5" /> Finding
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#24603b]">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Passed
                        </span>
                      )}
                    </TD>
                    <TD className="max-w-[380px] text-[11px] leading-relaxed text-muted">
                      {check.evidenceSummary}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={() => download("pdf")} disabled={downloading !== null}>
          <Download />
          Download PDF report
        </Button>
        <Button variant="outline" onClick={() => download("json")} disabled={downloading !== null}>
          <FileJson />
          Download JSON report
        </Button>
        <p className="text-[11px] text-muted">
          Reports include metadata, evidence, coverage, limitations and the scan disclaimer.
        </p>
      </div>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this scan?"
        description="The scan and its findings will be removed from stored history."
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={removeScan} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete scan"}
            </Button>
          </>
        }
      >
        <p className="text-xs text-muted">This action cannot be undone.</p>
      </Dialog>
    </div>
  );
}
