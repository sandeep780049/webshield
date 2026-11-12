"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { clearDemoSession, readDemoSession, writeDemoSession } from "@/lib/storage";
import type { SessionUser } from "@/lib/types";

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  cloudEnabled: boolean;
  authMode: "cloud" | "demo";
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<{ requiresConfirmation: boolean }>;
  enterDemo: (name: string, email: string) => void;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

function mapSupabaseUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): SessionUser {
  const email = user.email ?? "user@example.com";
  const metadataName = user.user_metadata?.name;
  return {
    id: user.id,
    email,
    name: typeof metadataName === "string" && metadataName.trim() ? metadataName : email.split("@")[0],
    provider: "supabase",
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const cloudEnabled = isSupabaseConfigured();

  React.useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setUser(readDemoSession());
      setLoading(false);
      return;
    }
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setUser(data.session?.user ? mapSupabaseUser(data.session.user) : readDemoSession());
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setUser(readDemoSession());
        setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? mapSupabaseUser(session.user) : readDemoSession());
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = React.useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Cloud authentication is not configured.");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const signUp = React.useCallback(
    async (name: string, email: string, password: string) => {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Cloud authentication is not configured.");
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) throw new Error(error.message);
      return { requiresConfirmation: !data.session };
    },
    [],
  );

  const enterDemo = React.useCallback((name: string, email: string) => {
    const session: SessionUser = {
      id: `demo_${email.toLowerCase()}`,
      email,
      name: name || email.split("@")[0] || "Demo analyst",
      provider: "demo",
    };
    writeDemoSession(session);
    setUser(session);
  }, []);

  const signOut = React.useCallback(async () => {
    const supabase = getSupabaseClient();
    if (supabase) await supabase.auth.signOut();
    clearDemoSession();
    setUser(null);
  }, []);

  const value = React.useMemo(
    () => ({
      user,
      loading,
      cloudEnabled,
      authMode: cloudEnabled ? ("cloud" as const) : ("demo" as const),
      signIn,
      signUp,
      enterDemo,
      signOut,
    }),
    [user, loading, cloudEnabled, signIn, signUp, enterDemo, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, router, pathname]);

  return { user, loading };
}
