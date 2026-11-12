import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type = "text", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink shadow-sm transition-colors placeholder:text-[#98a2b3] focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 disabled:cursor-not-allowed disabled:bg-[#f4f6f8]",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-24 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink shadow-sm transition-colors placeholder:text-[#98a2b3] focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 disabled:cursor-not-allowed disabled:bg-[#f4f6f8]",
        className,
      )}
      {...props}
    />
  );
}
