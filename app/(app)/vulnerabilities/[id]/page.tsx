"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  ExternalLink,
  Fingerprint,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import {
  ConfidenceBadge,
  SeverityBadge,
  TypeBadge,
  VerificationBadge,
} from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listScans } from "@/lib/storage";
import { SCAN_DISCLAIMER, SEVERITY_DESCRIPTIONS, TYPE_LABELS } from "@/lib/severity";
import type { Finding, Scan } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

const METHOD_LABELS: Record<Finding["verificationMethod"], string> = {
  "sql-error-signature": "Database error signature observed",
  "boolean-differential": "Boolean response differential",
  "time-based-response": "Time-based response delay",
  "payload-reflection": "Raw payload reflection",
  "stored-payload-replay": "Stored payload replayed on render",
  "dom-sink-analysis": "DOM sink analysis",
  "zap-alert": "Automated ZAP alert (not reproduced)",
};

export default function FindingDetailPage() {
  const params = useParams<{ id: string }>();
  const [finding, setFinding] = React.useState<Finding | null>(null);
  const [scan, setScan] = React.useState<Scan | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    listScans()
      .then((scans) => {
        if (!active) return;
        for (const candidate of scans) {
          const match = candidate.findings.find((item) => item.id === String(params.id));
          if (match) {
            setFinding(match);
            setScan(candidate);
            break;
          }
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [params.id]);

  if (loading) {
    return <div className="h-64 animate-pulse rounded-lg border border-line bg-surface" aria-busy="true" />;
  }

  if (!finding) {
    return (
      <EmptyState
        title="Finding not found"
        description="This finding is not present in the stored scan history for this session."
        icon={ShieldAlert}
        action={
          <Link href="/vulnerabilities">
            <Button variant="outline">
              <ArrowLeft />
              Back to vulnerabilities
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Finding detail"
        title={finding.title}
        description={`${TYPE_LABELS[finding.type]} · detected ${formatDateTime(finding.detectedAt)}`}
        actions={
          scan ? (
            <Link href={`/scans/${scan.id}`}>
              <Button variant="outline">
                Open scan
                <ArrowUpRight />
              </Button>
            </Link>
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.55fr_0.85fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <TypeBadge type={finding.type} />
                <SeverityBadge severity={finding.severity} />
                <ConfidenceBadge confidence={finding.confidence} />
                <VerificationBadge verification={finding.verification} />
                <Badge>{finding.source === "demo-lab" ? "Safe Demo Lab (simulated)" : "OWASP ZAP alert"}</Badge>
              </div>
              <p className="text-[13px] leading-relaxed text-ink">{finding.description}</p>
              <div className="grid gap-3 rounded-md border border-line bg-[#f9fbfc] p-3 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Affected endpoint
                  </p>
                  <p className="mt-1 break-all font-mono text-[11.5px] text-ink">
                    {finding.method} {finding.url}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Affected parameter
                  </p>
                  <p className="mt-1 font-mono text-[11.5px] text-ink">{finding.parameter}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Verification method
                  </p>
                  <p className="mt-1 text-[11.5px] text-ink">
                    {METHOD_LABELS[finding.verificationMethod]}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Finding ID
                  </p>
                  <p className="mt-1 flex items-center gap-1 break-all font-mono text-[10.5px] text-muted">
                    <Fingerprint className="h-3 w-3 shrink-0" />
                    {finding.id}
                  </p>
                </div>
              </div>
              {finding.source === "demo-lab" ? (
                <p className="rounded-md border border-[#ecdfb5] bg-[#fdf8e6] px-3 py-2 text-[11px] leading-relaxed text-[#7a5d0d]">
                  This is a simulated result from an isolated WebShield demo fixture. No real website
                  or database was attacked, and no script was executed.
                </p>
              ) : (
                <p className="rounded-md border border-[#ecdfb5] bg-[#fdf8e6] px-3 py-2 text-[11px] leading-relaxed text-[#7a5d0d]">
                  This finding came from an automated scanner alert. It is unverified until an
                  authorized professional reproduces and confirms it.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evidence</CardTitle>
              <CardDescription>
                Recorded request, payload and response observation for this finding.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Payload
                </p>
                <pre className="overflow-x-auto rounded-md border border-line bg-[#0f2140] px-3 py-2.5 text-[11.5px] leading-relaxed text-[#e6edf5] scrollbar-thin">
                  {finding.evidence.payload || "(no payload recorded)"}
                </pre>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Request
                </p>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border border-line bg-[#f7f9fb] px-3 py-2.5 text-[11px] leading-relaxed text-ink scrollbar-thin">
                  {finding.evidence.request}
                </pre>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Response observation
                </p>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-line bg-[#f7f9fb] px-3 py-2.5 text-[11px] leading-relaxed text-ink scrollbar-thin">
                  {finding.evidence.responseSnippet}
                </pre>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Analysis
                </p>
                <p className="rounded-md border border-line bg-surface px-3 py-2.5 text-[12px] leading-relaxed text-ink">
                  {finding.evidence.analysis}
                </p>
              </div>
              <p className="text-[10.5px] text-muted">
                Evidence marked as simulated comes from the deterministic demo lab. Scanner alerts
                retain the original alert evidence where ZAP provided it.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <Wrench className="h-4 w-4 text-accent" />
                Recommended remediation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[12.5px] leading-relaxed text-ink">{finding.remediation}</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[12px] leading-relaxed text-ink">{finding.risk}</p>
              <div className="mt-3 rounded-md border border-line bg-[#f9fbfc] px-3 py-2">
                <p className="text-[11px] font-medium capitalize text-navy">
                  {finding.severity} severity
                </p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
                  {SEVERITY_DESCRIPTIONS[finding.severity]}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-accent" />
                References
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {finding.references.map((reference) => (
                <a
                  key={reference}
                  href={reference}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-1.5 break-all text-[11.5px] leading-relaxed text-accent hover:underline"
                >
                  <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
                  {reference}
                </a>
              ))}
            </CardContent>
          </Card>

          {scan ? (
            <Card>
              <CardHeader>
                <CardTitle>Scan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-[11.5px]">
                <p className="font-medium text-navy">{scan.name}</p>
                <p className="break-all text-muted">{scan.target}</p>
                <p className="text-muted">{formatDateTime(scan.startedAt)}</p>
                <Link
                  href={`/scans/${scan.id}`}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                >
                  View full scan report
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </CardContent>
            </Card>
          ) : null}

          <p className="rounded-md border border-line bg-surface px-3 py-2.5 text-[10.5px] leading-relaxed text-muted">
            {SCAN_DISCLAIMER}
          </p>
        </div>
      </div>
    </div>
  );
}
