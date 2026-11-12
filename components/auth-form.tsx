"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FlaskConical, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const { cloudEnabled, signIn, signUp, enterDemo, user, loading } = useAuth();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [demoMode, setDemoMode] = React.useState(!cloudEnabled);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [nextPath, setNextPath] = React.useState("/dashboard");

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (next && next.startsWith("/")) setNextPath(next);
  }, []);

  React.useEffect(() => {
    if (!loading && user) router.replace(nextPath);
  }, [loading, user, router, nextPath]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (demoMode) {
        if (!email.trim()) throw new Error("Enter an email address for the local demo session.");
        enterDemo(name.trim(), email.trim());
        router.replace(nextPath);
        return;
      }
      if (mode === "signup") {
        if (!name.trim()) throw new Error("Enter your name.");
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");
        const result = await signUp(name.trim(), email.trim(), password);
        if (result.requiresConfirmation) {
          setNotice("Account created. Check your email to confirm the address, then sign in.");
          setBusy(false);
          return;
        }
        router.replace(nextPath);
        return;
      }
      await signIn(email.trim(), password);
      router.replace(nextPath);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-navy text-white">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="text-[15px] font-semibold text-navy">WebShield</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-navy"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to overview
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <Card>
          <CardHeader>
            <div className="mb-1 flex items-center justify-between">
              <CardTitle className="text-lg">
                {mode === "login" ? "Sign in to WebShield" : "Create your account"}
              </CardTitle>
              <Badge
                className={
                  demoMode
                    ? "border-[#ecdfb5] bg-[#fdf8e6] text-[#8a6a10]"
                    : "border-[#cfdff0] bg-[#eef4fa] text-[#2d5b86]"
                }
              >
                {demoMode ? "Local demo mode" : "Supabase account"}
              </Badge>
            </div>
            <CardDescription>
              {demoMode
                ? "A local demo session keeps scans and settings in this browser only. It is not real authentication and nothing is uploaded."
                : "Authentication is handled by the configured Supabase project. Scan history is stored against your account."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submit}>
              {demoMode || mode === "signup" ? (
                <Field label="Name" htmlFor="name">
                  <Input
                    id="name"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Security analyst"
                  />
                </Field>
              ) : null}

              <Field label="Email" htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </Field>

              {demoMode ? null : (
                <Field
                  label="Password"
                  htmlFor="password"
                  hint={mode === "signup" ? "At least 6 characters." : undefined}
                >
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                  />
                </Field>
              )}

              {error ? (
                <p className="rounded-md border border-[#f3c4c4] bg-[#fdecec] px-3 py-2 text-xs text-[#a32121]" role="alert">
                  {error}
                </p>
              ) : null}
              {notice ? (
                <p className="rounded-md border border-[#c8e3d1] bg-[#edf6f0] px-3 py-2 text-xs text-[#24603b]" role="status">
                  {notice}
                </p>
              ) : null}

              <Button type="submit" className="w-full" disabled={busy}>
                {busy
                  ? "Please wait…"
                  : demoMode
                    ? "Enter local demo mode"
                    : mode === "login"
                      ? "Sign in"
                      : "Create account"}
              </Button>
            </form>

            <div className="mt-4 space-y-3 text-center text-xs text-muted">
              {mode === "login" ? (
                <p>
                  No account?{" "}
                  <Link href={`/signup?next=${encodeURIComponent(nextPath)}`} className="font-medium text-accent hover:underline">
                    Create one
                  </Link>
                </p>
              ) : (
                <p>
                  Already registered?{" "}
                  <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="font-medium text-accent hover:underline">
                    Sign in
                  </Link>
                </p>
              )}

              {cloudEnabled ? (
                <button
                  type="button"
                  onClick={() => {
                    setDemoMode((current) => !current);
                    setError(null);
                    setNotice(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-accent hover:underline"
                >
                  <FlaskConical className="h-3.5 w-3.5" />
                  {demoMode ? "Use Supabase authentication instead" : "Continue in local demo mode"}
                </button>
              ) : (
                <p className="rounded-md border border-line bg-[#f7f9fb] px-3 py-2 text-[11px] leading-relaxed">
                  Supabase is not configured, so sign-up and login are replaced by a clearly labelled
                  local demo session.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
