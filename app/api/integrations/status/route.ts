import { NextResponse } from "next/server";
import { getZapConfig, getZapVersion } from "@/lib/zap";
import { parseAllowedDomains } from "@/lib/security/url-guard";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns integration status for the UI. Secrets (ZAP API key, Supabase anon
 * key) are deliberately NOT included in this response.
 */
export async function GET() {
  const config = getZapConfig();
  const version = config.configured ? await getZapVersion(config) : null;

  return NextResponse.json(
    {
      demoLab: { available: true },
      supabase: { configured: isSupabaseConfigured() },
      zap: {
        configured: config.configured,
        reachable: version !== null,
        version,
        message: config.configured
          ? version
            ? `OWASP ZAP ${version} reachable`
            : "ZAP is configured but the instance is not reachable"
          : "External scanner not configured",
      },
      authorizedDomains: parseAllowedDomains(),
      persistence: isSupabaseConfigured() ? "supabase" : "local",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
