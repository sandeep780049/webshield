import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "accent" | "warn" | "danger";
}) {
  return (
    <Card className="px-4 py-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
        {Icon ? (
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md border",
              tone === "danger"
                ? "border-[#f3c4c4] bg-[#fdecec] text-[#a32121]"
                : tone === "warn"
                  ? "border-[#ecdfb5] bg-[#fdf8e6] text-[#8a6a10]"
                  : tone === "accent"
                    ? "border-[#cfdff0] bg-[#eef4fa] text-[#2d5b86]"
                    : "border-line bg-[#f7f9fb] text-[#5b6675]",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-navy">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-muted">{hint}</p> : null}
    </Card>
  );
}
