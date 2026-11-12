"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Radar,
  Settings,
  ShieldAlert,
  X,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scan/new", label: "New Scan", icon: Radar },
  { href: "/scans", label: "Scan History", icon: History },
  { href: "/vulnerabilities", label: "Vulnerabilities", icon: ShieldAlert },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

function ShieldMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md bg-navy text-white",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3 4.5 6v5.5c0 4.3 3.2 7.4 7.5 9.5 4.3-2.1 7.5-5.2 7.5-9.5V6L12 3Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    </span>
  );
}

export function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5" aria-label="WebShield dashboard">
      <ShieldMark />
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold tracking-tight text-navy">WebShield</span>
        <span className="block text-[10px] uppercase tracking-[0.14em] text-muted">
          Security testing
        </span>
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, cloudEnabled } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Main navigation">
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
              active
                ? "bg-accent-soft text-navy"
                : "text-muted hover:bg-[#f4f7fa] hover:text-navy",
            )}
          >
            <Icon className={cn("h-4 w-4", active ? "text-accent" : "text-[#7c8796]")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarBody = (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Brand />
      </div>
      <div className="flex-1 px-3">{nav}</div>
      <div className="space-y-3 border-t border-line px-3 py-4">
        <div className="rounded-md border border-line bg-[#f8fafc] px-3 py-2.5">
          <p className="truncate text-xs font-medium text-navy">{user?.name ?? "Analyst"}</p>
          <p className="truncate text-[11px] text-muted">{user?.email}</p>
          <Badge className="mt-2 border-[#cfdff0] bg-[#eef4fa] text-[#2d5b86]">
            {cloudEnabled && user?.provider === "supabase" ? "Supabase account" : "Local demo mode"}
          </Badge>
        </div>
        <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
          <LogOut />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-line bg-surface lg:block">
        {sidebarBody}
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur lg:hidden">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <Menu />
            </Button>
            <Brand />
          </div>
          <Badge>{cloudEnabled && user?.provider === "supabase" ? "Cloud" : "Demo"}</Badge>
        </header>

        {mobileOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-navy/35"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute inset-y-0 left-0 w-64 border-r border-line bg-surface shadow-xl">
              <div className="flex justify-end p-2">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close navigation menu"
                  onClick={() => setMobileOpen(false)}
                >
                  <X />
                </Button>
              </div>
              {sidebarBody}
            </div>
          </div>
        ) : null}

        <main className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
