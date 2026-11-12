import { Badge } from "@/components/ui/badge";
import {
  CONFIDENCE_STYLES,
  SEVERITY_STYLES,
  STATUS_STYLES,
  TYPE_LABELS,
} from "@/lib/severity";
import { cn } from "@/lib/utils";
import type { Confidence, Finding, ScanStatus, Severity } from "@/lib/types";

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <Badge className={cn("capitalize", SEVERITY_STYLES[severity])}>{severity}</Badge>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return (
    <Badge className={cn("capitalize", CONFIDENCE_STYLES[confidence])}>{confidence}</Badge>
  );
}

export function StatusBadge({ status }: { status: ScanStatus }) {
  return (
    <Badge className={cn("capitalize", STATUS_STYLES[status])}>
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "completed"
            ? "bg-[#24603b]"
            : status === "running"
              ? "bg-[#2d5b86]"
              : status === "failed"
                ? "bg-[#a32121]"
                : "bg-[#8b95a3]",
        )}
      />
      {status}
    </Badge>
  );
}

export function TypeBadge({ type }: { type: Finding["type"] }) {
  return (
    <Badge
      className={cn(
        type === "sqli"
          ? "border-[#cfdff0] bg-[#eef4fa] text-[#2d5b86]"
          : "border-[#ded6ee] bg-[#f4f0fa] text-[#5b4382]",
      )}
    >
      {TYPE_LABELS[type]}
    </Badge>
  );
}

export function VerificationBadge({ verification }: { verification: Finding["verification"] }) {
  return (
    <Badge
      className={cn(
        verification === "verified"
          ? "border-[#c8e3d1] bg-[#edf6f0] text-[#24603b]"
          : "border-[#ecdfb5] bg-[#fdf8e6] text-[#8a6a10]",
      )}
    >
      {verification === "verified" ? "Verified" : "Unverified"}
    </Badge>
  );
}
