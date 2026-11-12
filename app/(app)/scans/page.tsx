"use client";

import * as React from "react";
import Link from "next/link";
import { History, Radar, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";
import { deleteScan, listScans } from "@/lib/storage";
import type { Scan } from "@/lib/types";
import { formatDateTime, formatDuration, truncate } from "@/lib/utils";

export default function ScanHistoryPage() {
  const [scans, setScans] = React.useState<Scan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deleteTarget, setDeleteTarget] = React.useState<Scan | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setScans(await listScans());
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteScan(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="History"
        title="Scan history"
        description="Every scan stored for this session, including demo-lab runs and authorized external scans."
        actions={
          <Link href="/scan/new">
            <Button>
              <Radar />
              New scan
            </Button>
          </Link>
        }
      />

      {loading ? (
        <div className="h-40 animate-pulse rounded-lg border border-line bg-surface" aria-busy="true" />
      ) : scans.length === 0 ? (
        <EmptyState
          title="No scans recorded"
          description="Run the Safe Demo Lab to create the first scan. It works without an account, API key or external scanner."
          icon={History}
          action={
            <Link href="/scan/new">
              <Button>
                <Radar />
                Start a demo scan
              </Button>
            </Link>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <tr>
                  <TH>Scan name</TH>
                  <TH>Target</TH>
                  <TH>Date</TH>
                  <TH>Duration</TH>
                  <TH>Status</TH>
                  <TH>SQLi</TH>
                  <TH>XSS</TH>
                  <TH className="text-right">Actions</TH>
                </tr>
              </THead>
              <TBody>
                {scans.map((scan) => (
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
                    <TD className="max-w-[220px] truncate text-xs text-muted" title={scan.target}>
                      {truncate(scan.target, 44)}
                    </TD>
                    <TD className="whitespace-nowrap text-xs text-muted">
                      {formatDateTime(scan.startedAt)}
                    </TD>
                    <TD className="whitespace-nowrap text-xs text-muted">
                      {formatDuration(scan.durationMs)}
                    </TD>
                    <TD>
                      <StatusBadge status={scan.status} />
                    </TD>
                    <TD className="text-xs font-medium">
                      {scan.findings.filter((finding) => finding.type === "sqli").length}
                    </TD>
                    <TD className="text-xs font-medium">
                      {scan.findings.filter((finding) => finding.type === "xss").length}
                    </TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link href={`/scans/${scan.id}`}>
                          <Button variant="ghost" size="sm">
                            Open
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete scan ${scan.name}`}
                          onClick={() => setDeleteTarget(scan)}
                        >
                          <Trash2 className="h-4 w-4 text-[#a32121]" />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete this scan?"
        description="This permanently removes the scan and its findings from stored history."
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete scan"}
            </Button>
          </>
        }
      >
        <p className="text-xs leading-relaxed text-muted">
          {deleteTarget ? (
            <>
              <span className="font-medium text-navy">{deleteTarget.name}</span> —{" "}
              {deleteTarget.findings.length} finding(s). This action cannot be undone.
            </>
          ) : null}
        </p>
      </Dialog>
    </div>
  );
}
