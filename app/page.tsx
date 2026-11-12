import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Database,
  FileText,
  FlaskConical,
  Lock,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

const MODULES = [
  {
    title: "SQL injection detection",
    description:
      "Error-based, boolean-based and time-based probes run against controlled fixtures, with evidence captured for every finding.",
    icon: Database,
  },
  {
    title: "XSS coverage",
    description:
      "Reflected, stored and DOM-based cases are separated, with safe output encoding demonstrated alongside vulnerable cases.",
    icon: ShieldAlert,
  },
  {
    title: "Safe Demo Lab",
    description:
      "A deterministic, isolated lab that works without ZAP, API keys or paid services. Findings are clearly marked as simulated.",
    icon: FlaskConical,
  },
  {
    title: "Reports and history",
    description:
      "Downloads as PDF or JSON, with coverage, limitations, severity, confidence and remediation guidance.",
    icon: FileText,
  },
];

const STEPS = [
  "Choose the Safe Demo Lab or an authorised target.",
  "Validate scope and confirm authorisation.",
  "Run SQLi and XSS checks with evidence capture.",
  "Review verified findings, history and reports.",
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-navy text-white">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-[15px] font-semibold text-navy">WebShield</span>
              <span className="block text-[10px] uppercase tracking-[0.14em] text-muted">
                Security testing
              </span>
            </span>
          </div>
          <nav className="flex items-center gap-2" aria-label="Account">
            <Link
              href="/login"
              className="rounded-md px-3 py-2 text-[13px] font-medium text-muted hover:bg-accent-soft hover:text-navy"
            >
              Sign in
            </Link>
            <Link
              href="/login?next=/dashboard"
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-2 text-[13px] font-medium text-white hover:bg-accent-dark"
            >
              Open dashboard
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-20">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#cfdff0] bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-[#2d5b86]">
              <Lock className="h-3 w-3" />
              Academic security engineering project
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight text-navy sm:text-5xl">
              Automated web application security testing.
            </h1>
            <p className="mt-5 text-[15px] leading-relaxed text-muted">
              WebShield detects SQL injection and cross-site scripting, records evidence, classifies
              severity and confidence, and produces downloadable reports. Start with the built-in
              Safe Demo Lab — no external services required.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/login?next=/scan/new"
                className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-accent-dark"
              >
                <ScanSearch className="h-4 w-4" />
                Run a demo scan
              </Link>
              <Link
                href="/login?next=/dashboard"
                className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-5 py-2.5 text-sm font-medium text-ink hover:bg-accent-soft"
              >
                View dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted">
              Local demo mode works without an account or cloud configuration. External scans are
              disabled unless an authorised ZAP instance and target allowlist are configured.
            </p>
          </div>

          <div className="rounded-lg border border-line bg-surface p-5 shadow-[0_2px_10px_rgba(15,33,64,0.05)]">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Demo lab coverage
                </p>
                <p className="mt-0.5 text-sm font-semibold text-navy">7 controlled test cases</p>
              </div>
              <span className="rounded-full border border-[#c8e3d1] bg-[#edf6f0] px-2 py-0.5 text-[10px] font-medium text-[#24603b]">
                Available offline
              </span>
            </div>
            <ul className="mt-4 space-y-2.5 text-[12.5px]">
              {[
                "SQL injection, string concatenation fixture",
                "SQL injection, safe parameterized fixture",
                "Reflected XSS, unencoded reflection",
                "Stored XSS, persistent comment render",
                "DOM-based XSS via unsafe innerHTML sink",
                "HTML-encoded safe reflection",
                "Non-vulnerable search parameter",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-ink">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-md border border-[#ecdfb5] bg-[#fdf8e6] px-3 py-2.5 text-[11px] leading-relaxed text-[#7a5d0d]">
              Demo lab findings are simulated results from isolated fixtures. They are not findings
              from a real website.
            </div>
          </div>
        </section>

        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
            <h2 className="text-xl font-semibold tracking-tight text-navy">
              Two focused detection modules
            </h2>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted">
              Each module is implemented separately so results, evidence and remediation guidance stay
              specific to the vulnerability class.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {MODULES.map((module) => {
                const Icon = module.icon;
                return (
                  <div key={module.title} className="rounded-lg border border-line bg-[#fdfefe] p-4">
                    <span className="mb-3 flex h-8 w-8 items-center justify-center rounded-md border border-line bg-[#f7f9fb] text-accent">
                      <Icon className="h-4 w-4" />
                    </span>
                    <h3 className="text-sm font-semibold text-navy">{module.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted">{module.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-navy">How a scan runs</h2>
              <ol className="mt-5 space-y-4">
                {STEPS.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-[11px] font-semibold text-accent">
                      {index + 1}
                    </span>
                    <p className="pt-0.5 text-[13px] leading-relaxed text-ink">{step}</p>
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-lg border border-line bg-surface p-5">
              <h2 className="text-sm font-semibold text-navy">Scope and limitations</h2>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
                <li>
                  External scanning requires a separately hosted OWASP ZAP instance, a server-side API
                  key and an allowlist of target domains you are authorised to test.
                </li>
                <li>
                  Localhost, private networks, cloud metadata endpoints and unresolvable hosts are
                  blocked by server-side validation.
                </li>
                <li>
                  Automated detection cannot prove an application is secure, and not every SQL
                  injection or XSS variant can be found.
                </li>
                <li>
                  Scanner alerts are labelled unverified until a human reproduces them; demo lab
                  findings are labelled simulated.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-line bg-navy px-6 py-8 text-white sm:px-8">
            <h2 className="text-xl font-semibold tracking-tight">Try the full workflow now</h2>
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-[#c7d3e2]">
              Start a demo scan, inspect each finding and export the report. Everything is stored in
              your browser unless Supabase is configured.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/login?next=/scan/new"
                className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-medium text-navy hover:bg-[#eef2f7]"
              >
                Start a demonstration
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login?next=/settings"
                className="inline-flex items-center gap-2 rounded-md border border-white/25 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10"
              >
                View integration settings
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs leading-relaxed text-muted sm:px-6 lg:px-8">
          <p className="font-medium text-navy">WebShield — Automated Web Application Security Testing</p>
          <p className="mt-1 max-w-3xl">
            An automated scan cannot guarantee that an application is completely secure. Results
            should be reviewed and validated by an authorized security professional.
          </p>
        </div>
      </footer>
    </div>
  );
}
