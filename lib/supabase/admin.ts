import { createClient } from "@supabase/supabase-js";

/** Server-only Supabase client. Never import this module from a Client Component. */
if (typeof window !== "undefined") {
  throw new Error("Supabase admin client hanya boleh digunakan di server.");
}

export function selectSupabaseAdminKey(environment: Record<string, string | undefined>): string | null {
  const candidate = environment.VERCEL_ENV === "production"
    ? environment.SUPABASE_PRODUCTION_SECRET_KEY
    : environment.SUPABASE_SECRET_KEY || environment.SUPABASE_SERVICE_ROLE_KEY;
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
}

export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = selectSupabaseAdminKey(process.env);

  if (!url || !serviceKey) {
    throw new Error("Konfigurasi autentikasi server belum tersedia.");
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Server-side PostgREST client carrying the already-verified caller JWT.
 * SECURITY DEFINER RPCs that derive authority from auth.uid() must use this
 * client instead of the service-role client. Never pass a browser-supplied
 * actor ID to those RPCs.
 */
export function createSupabaseUserClient(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey || !accessToken.trim()) {
    throw new Error("Konfigurasi sesi Supabase belum tersedia.");
  }

  return createClient(url, publishableKey, {
    global: { headers: { Authorization: `Bearer ${accessToken.trim()}` } },
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}
