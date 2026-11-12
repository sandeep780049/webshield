import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ShieldCheck } from "lucide-react";

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = ShieldCheck,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line bg-surface px-6 py-14 text-center">
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-[#f7f9fb] text-muted">
        <Icon className="h-5 w-5" />
      </span>
      <h2 className="text-sm font-semibold text-navy">{title}</h2>
      <p className="mt-1 max-w-md text-xs leading-relaxed text-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
