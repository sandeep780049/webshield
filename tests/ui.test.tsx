import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: navigation.push,
    replace: navigation.replace,
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/dashboard",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

import HomePage from "@/app/page";
import DashboardPage from "@/app/(app)/dashboard/page";
import NewScanPage from "@/app/(app)/scan/new/page";
import { AuthProvider } from "@/components/auth-provider";
import { AppShell } from "@/components/app-shell";
import { runDemoScan } from "@/lib/scanner/engine";
import { upsertLocalScan, writeDemoSession } from "@/lib/storage";

function seedSession() {
  writeDemoSession({
    id: "demo_test",
    email: "analyst@example.com",
    name: "Test Analyst",
    provider: "demo",
  });
}

function fakeFetch() {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/api/integrations/status")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          demoLab: { available: true },
          supabase: { configured: false },
          zap: { configured: false, reachable: false, version: null, message: "External scanner not configured" },
          authorizedDomains: [],
          persistence: "local",
        }),
      } as unknown as Response;
    }
    if (url.includes("/api/scan/demo")) {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      const scan = runDemoScan({
        name: body.name ?? "Demo",
        scope: body.scope ?? "full",
        sqli: body.sqli ?? true,
        xss: body.xss ?? true,
      });
      return { ok: true, status: 201, json: async () => ({ scan }) } as unknown as Response;
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
}

describe("homepage", () => {
  it("loads and presents the main call to action", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { name: /automated web application security testing/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/WebShield/).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /run a demo scan/i })).toHaveAttribute(
      "href",
      "/login?next=/scan/new",
    );
  });
});

describe("navigation", () => {
  it("renders the sidebar links for every section", async () => {
    seedSession();
    render(
      <AuthProvider>
        <AppShell>
          <p>Application content</p>
        </AppShell>
      </AuthProvider>,
    );

    for (const [label, href] of [
      ["Dashboard", "/dashboard"],
      ["New Scan", "/scan/new"],
      ["Scan History", "/scans"],
      ["Vulnerabilities", "/vulnerabilities"],
      ["Reports", "/reports"],
      ["Settings", "/settings"],
    ]) {
      const links = await screen.findAllByRole("link", { name: label });
      expect(links.some((link) => link.getAttribute("href") === href)).toBe(true);
    }
  });
});

describe("dashboard", () => {
  it("derives metrics from stored scans", async () => {
    seedSession();
    const scan = runDemoScan({ name: "Dashboard seed scan" });
    upsertLocalScan(scan);

    render(
      <AuthProvider>
        <DashboardPage />
      </AuthProvider>,
    );

    expect(await screen.findByText("Dashboard seed scan")).toBeInTheDocument();
    const sqliFindings = scan.findings.filter((finding) => finding.type === "sqli").length;
    const xssFindings = scan.findings.filter((finding) => finding.type === "xss").length;
    expect(sqliFindings).toBeGreaterThan(0);
    expect(xssFindings).toBeGreaterThan(0);
    expect(await screen.findByText("SQLi vs XSS findings")).toBeInTheDocument();
  });

  it("shows an honest empty state when no scans exist", async () => {
    seedSession();
    render(
      <AuthProvider>
        <DashboardPage />
      </AuthProvider>,
    );
    expect(await screen.findByText(/No scans stored yet/i)).toBeInTheDocument();
  });
});

describe("new scan workflow", () => {
  it("runs a demo scan and navigates to the completed report", async () => {
    vi.stubGlobal("fetch", fakeFetch());
    const user = userEvent.setup();
    render(<NewScanPage />);

    await user.click(screen.getByRole("button", { name: /start scan/i }));

    await waitFor(() => {
      expect(navigation.push).toHaveBeenCalledWith(expect.stringMatching(/^\/scans\/.+/));
    });
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /scan in progress/i })).not.toBeInTheDocument();
    });

    const stored = window.localStorage.getItem("webshield.scans.v1");
    expect(stored).toBeTruthy();
    const scans = JSON.parse(stored as string);
    expect(scans).toHaveLength(1);
    expect(scans[0].status).toBe("completed");
    expect(scans[0].findings.length).toBeGreaterThan(0);

    vi.unstubAllGlobals();
  });
});
