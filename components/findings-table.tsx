import Link from "next/link";
import {
  ConfidenceBadge,
  SeverityBadge,
  TypeBadge,
  VerificationBadge,
} from "@/components/status-badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { Finding } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export function FindingsTable({ findings }: { findings: Finding[] }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Finding ID</TH>
          <TH>Type</TH>
          <TH>Affected URL</TH>
          <TH>Parameter</TH>
          <TH>Severity</TH>
          <TH>Confidence</TH>
          <TH>Verification</TH>
          <TH>Detected</TH>
        </tr>
      </THead>
      <TBody>
        {findings.map((finding) => (
          <TR key={finding.id}>
            <TD className="whitespace-nowrap font-mono text-[11px] text-muted">
              <Link
                href={`/vulnerabilities/${finding.id}`}
                className="text-accent underline-offset-4 hover:underline"
              >
                {finding.id.slice(0, 14)}
              </Link>
            </TD>
            <TD>
              <TypeBadge type={finding.type} />
            </TD>
            <TD className="max-w-[260px]">
              <Link
                href={`/vulnerabilities/${finding.id}`}
                className="block truncate text-ink underline-offset-4 hover:text-accent hover:underline"
                title={finding.url}
              >
                {finding.url.replace("webshield-demo://lab", "")}
              </Link>
            </TD>
            <TD className="font-mono text-[12px]">{finding.parameter}</TD>
            <TD>
              <SeverityBadge severity={finding.severity} />
            </TD>
            <TD>
              <ConfidenceBadge confidence={finding.confidence} />
            </TD>
            <TD>
              <VerificationBadge verification={finding.verification} />
            </TD>
            <TD className="whitespace-nowrap text-xs text-muted">
              {formatDateTime(finding.detectedAt)}
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
