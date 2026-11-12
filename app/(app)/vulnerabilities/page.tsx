"use client";

import * as React from "react";
import Link from "next/link";
import { Filter, Radar, ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { FindingsTable } from "@/components/findings-table";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/label";
import { listScans } from "@/lib/storage";
import { SEVERITY_ORDER, sortFindings } from "@/lib/severity";
import type { Finding, Scan, Severity } from "@/lib/types";

type TypeFilter = "all" | "sqli" | "xss";
type SeverityFilter = "all" | Severity;
type VerificationFilter = "all" | "verified" | "unverified";

export default function VulnerabilitiesPage() {
  const [scans, setScans] = React.useState<Scan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [type, setType] = React.useState<TypeFilter>("all");
  const [severity, setSeverity] = React.useState<SeverityFilter>("all");
  const [verification, setVerification] = React.useState<VerificationFilter>("all");

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

  const findings = React.useMemo(
    () => sortFindings(scans.flatMap((scan) => scan.findings)),
    [scans],
  );

  const filtered = React.useMemo(
    () =>
      findings.filter((finding: Finding) => {
        if (type !== "all" && finding.type !== type) return false;
        if (severity !== "all" && finding.severity !== severity) return false;
        if (verification !== "all" && finding.verification !== verification) return false;
        return true;
      }),
    [findings, type, severity, verification],
  );

  const reset = () => {
    setType("all");
    setSeverity("all");
    setVerification("all");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Findings"
        title="Vulnerabilities"
        description="All SQL injection and XSS findings from stored scans. Demo-lab findings are simulated; external scanner alerts stay unverified until reproduced."
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
      ) : findings.length === 0 ? (
        <EmptyState
          title="No findings recorded"
          description="Vulnerabilities appear here after a scan is completed. The Safe Demo Lab includes deliberately vulnerable and safe fixtures you can test immediately."
          icon={ShieldAlert}
          action={
            <Link href="/scan/new">
              <Button>
                <Radar />
                Run a demo scan
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          <Card className="mb-4">
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                  <Filter className="h-3.5 w-3.5" />
                  Filters
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Select
                    aria-label="Filter by vulnerability type"
                    value={type}
                    onChange={(event) => setType(event.target.value as TypeFilter)}
                  >
                    <option value="all">All types</option>
                    <option value="sqli">SQL Injection</option>
                    <option value="xss">XSS</option>
                  </Select>
                  <Select
                    aria-label="Filter by severity"
                    value={severity}
                    onChange={(event) => setSeverity(event.target.value as SeverityFilter)}
                  >
                    <option value="all">All severities</option>
                    {SEVERITY_ORDER.map((item) => (
                      <option key={item} value={item} className="capitalize">
                        {item[0].toUpperCase() + item.slice(1)}
                      </option>
                    ))}
                  </Select>
                  <Select
                    aria-label="Filter by verification status"
                    value={verification}
                    onChange={(event) => setVerification(event.target.value as VerificationFilter)}
                  >
                    <option value="all">All verification states</option>
                    <option value="verified">Verified</option>
                    <option value="unverified">Unverified</option>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted">
                  {filtered.length} of {findings.length}
                </span>
                <Button variant="outline" size="sm" onClick={reset}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <p className="px-5 py-10 text-center text-xs text-muted">
                  No findings match the selected filters.
                </p>
              ) : (
                <FindingsTable findings={filtered} />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
