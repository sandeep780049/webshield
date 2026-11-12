# WebShield

**Automated Web Application Security Testing**

WebShield is a working prototype of an automated web application vulnerability scanner focused on two classes: **SQL Injection (SQLi)** and **Cross-Site Scripting (XSS)**. It includes a self-contained **Safe Demo Lab** that produces real, deterministic scan results without OWASP ZAP, API keys or paid services.

This is an academic project. It is not a substitute for a professional security assessment.

---

## What works

- **Authentication** — Supabase email/password when configured; otherwise a clearly labelled local demo session (not real authentication).
- **Dashboard** — total scans, pages discovered, SQLi/XSS counts, severity distribution, scan activity chart and recent activity. Every number is derived from stored scans (zeros plus an empty state when there are none).
- **New Scan** — scan name, target, mode, scope, SQLi/XSS toggles; authorization confirmation and allowlist checks for external scans.
- **Safe Demo Lab** — 9 fixtures covering vulnerable and safe SQLi, reflected, stored and DOM XSS. Results are labelled as simulated.
- **Scan workflow** — validation, discovery (fixtures), SQLi checks, XSS checks, evidence capture, verification, severity/confidence classification, persistence and report display.
- **Findings** — filterable table (type, severity, verification) and a detail page with evidence, risk, remediation and references.
- **Scan history** — persistent history (Supabase or browser storage), open and delete with confirmation.
- **Reports** — PDF (jsPDF) and JSON exports including scan metadata, findings, evidence, coverage, limitations and disclaimer.
- **Settings** — profile, demo/cloud status, ZAP status, authorized domains, scan timeout, default scope and report preferences.
- **Optional ZAP integration** — asynchronous start/poll API. Disabled with a clear status when not configured.

## Technology

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS v4, shadcn/ui-style locally maintained components
- Next.js server-side route handlers (Node runtime)
- Recharts for charts, jsPDF for PDF reports
- Supabase (optional) for auth and cloud scan history
- Vitest + Testing Library + jsdom for automated tests
- Vercel-compatible architecture — no long-running containers or Flask servers

## Getting started

```bash
npm install
cp .env.example .env.local   # optional configuration
npm run dev                  # http://localhost:3000
```

With no environment variables, WebShield starts in **local demo mode**:

1. Open `/login` and choose **Enter local demo mode** (a name and email are stored only in this browser).
2. Go to **New Scan**, keep mode **Safe Demo Lab**, press **Start scan**.
3. Inspect the scan report, findings and downloaded reports.

```bash
npm run typecheck   # TypeScript
npm test            # Vitest suite
npm run build       # production build
npm start           # serve the production build
```

## Environment variables

Copy `.env.example` to `.env.local`. All variables are optional.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. Enables real auth and cloud history. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key. Never use a service-role key here. |
| `ZAP_API_URL` | Base URL of a separately hosted OWASP ZAP instance (server-side only). |
| `ZAP_API_KEY` | ZAP API key (server-side only, never `NEXT_PUBLIC_`). |
| `ZAP_SCAN_TIMEOUT_MS` | Maximum external scan duration. Default `900000`. |
| `AUTHORIZED_SCAN_DOMAINS` | Comma-separated allowlist for external scans, e.g. `staging.example.com`. |
| `SCAN_RATE_LIMIT_PER_MINUTE` | Scan creation rate limit per client IP. Default `6`. |

Secrets are only read in server code. `/api/integrations/status` returns status flags and messages, never keys.

## Safe Demo Lab fixtures

| Fixture | Category | Expected result |
| --- | --- | --- |
| `/lab/products?category=` | SQLi, string concatenation | Vulnerable (error signature, boolean differential, timing) |
| `/lab/products-safe?category=` | SQLi, parameterized query | Safe |
| `/lab/login` (POST `username`) | SQLi, auth bypass fixture | Vulnerable |
| `/lab/login-safe` (POST `username`) | SQLi, parameterized query | Safe |
| `/lab/search?q=` | Reflected XSS, no encoding | Vulnerable |
| `/lab/search-safe?q=` | Reflected XSS, HTML encoded | Safe |
| `/lab/comments` (POST `comment`) | Stored XSS | Vulnerable |
| `/lab/comments-safe` (POST `comment`) | Stored XSS, encoded on render | Safe |
| `/lab/profile?name=` | DOM XSS, `innerHTML` sink | Vulnerable |
| `/lab/profile-safe?name=` | DOM XSS, `textContent` sink | Safe |
| `/lab/newsletter?email=` | Non-vulnerable search parameter | Safe |

No real database is queried and no script is executed. The SQLi module simulates two server implementations (string concatenation vs bound parameter) and detects error signatures, boolean differentials and timing behaviour. The XSS module checks for raw payload reflection, stored-payload replay, and DOM sink types. The UI states that reflections/sink analysis are verified evidence — not confirmed script execution.

## Severity and confidence

| Severity | Meaning |
| --- | --- |
| Critical | Direct, high-impact compromise demonstrated with strong evidence (not assigned automatically). |
| High | Exploitable issue with significant data or client-side impact. |
| Medium | Exploitable under common conditions with moderate impact/reliability. |
| Low | Limited impact or unusual preconditions. |
| Informational | Observation without demonstrated security impact. |

Confidence is `high`, `medium` or `low` and reflects the strength of the recorded evidence (for example, a database error signature is stronger than a timing delay). Automated ZAP alerts are always stored as **unverified** and are never classified as Critical automatically.

## Supabase setup (optional)

1. Create a Supabase project and copy the URL and anon key into `.env.local`.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor. It creates the `scans` table with row-level security so users only see their own scans.
3. Restart the app. Sign up at `/signup`, confirm the email if required, then sign in.

Without these values the app does not pretend cloud auth/persistence is active; settings label the session as local demo mode and history is kept in `localStorage`.

## OWASP ZAP setup (optional)

ZAP is external scanning only and must be hosted **outside** Vercel. A typical deployment:

1. Run ZAP on a dedicated host with HTTPS and an API key (`-config api.key=...`).
2. Set `ZAP_API_URL`, `ZAP_API_KEY` and `AUTHORIZED_SCAN_DOMAINS` on the Vercel project (server-side env vars).
3. Restart/redeploy. Settings should show **Configured**.

Start and poll endpoints:

- `POST /api/scan/external` — validates the target, requires `authorizationConfirmed: true`, starts the spider and active scan, returns `202` with a `pollUrl`.
- `GET /api/scan/external?id=<scanId>` — polls ZAP, returns progress and classified SQLi/XSS alerts; the client persists the final scan.

External scan job state is held in an instance-local registry (suitable for this prototype). For multi-instance production use, persist job records in Supabase or another durable store. External scanning is rejected with HTTP 503 when ZAP is not configured; the Safe Demo Lab remains fully functional.

### Security controls for external scans

- Only `http://` and `https://`, no embedded credentials, limited ports.
- Explicit domain allowlist required; empty allowlist rejects all external scans.
- DNS resolution checks reject private, loopback, link-local, CGNAT and reserved addresses (including `169.254.169.254`).
- Redirects are followed manually (max 3) and re-validated at each hop.
- Fetch timeouts and response size limits.
- Per-IP rate limiting on scan creation.
- ZAP key and other secrets remain server-side.

## Project structure

```
webshield/
├── app/
│   ├── (app)/                 # Protected application shell
│   │   ├── dashboard/
│   │   ├── scan/new/
│   │   ├── scans/             # History and per-scan report
│   │   ├── vulnerabilities/   # List and finding detail
│   │   ├── reports/
│   │   └── settings/
│   ├── api/
│   │   ├── scan/demo/         # Safe Demo Lab execution
│   │   ├── scan/external/     # Authorized ZAP start/poll
│   │   └── integrations/status/
│   ├── login/ signup/         # Auth (Supabase or local demo)
│   ├── layout.tsx
│   └── page.tsx               # Public overview
├── components/
│   ├── ui/                    # shadcn/ui-style primitives
│   ├── app-shell.tsx
│   ├── auth-provider.tsx
│   ├── charts.tsx
│   ├── findings-table.tsx
│   └── status-badge.tsx
├── lib/
│   ├── scanner/
│   │   ├── fixtures.ts        # Demo lab fixtures and payloads
│   │   ├── sqli.ts            # SQLi simulator + detector
│   │   ├── xss.ts             # XSS simulator + detector
│   │   └── engine.ts          # Scan workflow
│   ├── security/
│   │   ├── url-guard.ts       # SSRF / target validation
│   │   └── rate-limit.ts
│   ├── reports.ts             # JSON/PDF reports
│   ├── storage.ts             # Supabase or localStorage
│   ├── severity.ts            # Classification policy
│   ├── supabase/client.ts
│   ├── zap.ts
│   └── types.ts
├── supabase/schema.sql
├── tests/                     # Vitest suites
├── .env.example
├── next.config.ts
└── vercel.json
```

## Automated tests

`npm test` covers:

- Demo lab: vulnerable SQLi fixtures detected, safe parameterized fixtures not reported, reflected/stored/DOM XSS detected, safe encoded fixtures not reported, SQLi/XSS separation, evidence attached, scan completion, module toggles and scope.
- Security: localhost/private/metadata/IPv6 blocking, allowlist enforcement, DNS rebinding rejection, invalid schemes/credentials/ports.
- API: demo scans complete, invalid requests rejected, external scanning disabled without ZAP, authorization required, private targets rejected before ZAP is contacted, secrets absent from integration status.
- Reports: required JSON fields, disclaimer, PDF byte output.
- Persistence: save/retrieve/delete scans, settings round-trip.
- UI: homepage renders, navigation links exist, dashboard derives metrics from stored scans, demo scan starts and completes then navigates to the report.

## Deploying to Vercel

1. Push this directory to a GitHub repository.
2. In Vercel, **Add New → Project**, import the repository. Framework preset: **Next.js**. Build command `npm run build`, output handled automatically.
3. Add optional environment variables (Supabase and/or ZAP) under **Project → Settings → Environment Variables**. Do not add `NEXT_PUBLIC_` to secrets.
4. Deploy. The app is immediately usable in local demo mode without any variables.

CLI alternative:

```bash
npm i -g vercel
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL   # optional
vercel --prod
```

Do not attempt to run ZAP as a Vercel service. Host it separately and expose only its API over HTTPS.

## Limitations

- Automated scanning cannot guarantee an application is secure, and not every SQLi/XSS variant is detectable.
- The Safe Demo Lab is a simulation of controlled fixtures; it is not evidence about a real target.
- The ZAP integration is a prototype: job state is instance-local, and alert classification only covers SQL injection and XSS.
- The in-memory rate limiter is best-effort on serverless platforms.
- Access-control, business-logic and authentication flaws outside SQLi/XSS are out of scope.

> **Disclaimer:** An automated scan cannot guarantee that an application is completely secure. Results should be reviewed and validated by an authorized security professional.
