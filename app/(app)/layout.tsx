"use client";

import { useRequireAuth } from "@/components/auth-provider";
import { AppShell } from "@/components/app-shell";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useRequireAuth();

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="flex items-center gap-3 text-sm text-muted" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" />
          Checking session…
        </div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
