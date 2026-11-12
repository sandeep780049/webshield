import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-line bg-[#f7f9fb] px-2 py-0.5 text-[11px] font-medium text-muted",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
