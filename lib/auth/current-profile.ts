import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export type CurrentProfile = {
  id: string;
  role: string;
  rt: string | null;
  no_kk: string | null;
  nama: string | null;
  nama_lengkap: string | null;
  nik: string | null;
  no_hp: string | null;
};

export type VerifiedCurrentProfile = { user: User; profile: CurrentProfile };

const CACHE_TTL_MS = 60_000;
let cached: { value: VerifiedCurrentProfile; expiresAt: number } | null = null;
let inFlight: Promise<VerifiedCurrentProfile | null> | null = null;

supabase.auth.onAuthStateChange((_event, session) => {
  if (!session || (cached && session.user.id !== cached.value.user.id)) {
    cached = null;
    inFlight = null;
  }
});

export function getCachedVerifiedProfile(): VerifiedCurrentProfile | null {
  if (!cached || cached.expiresAt <= Date.now()) {
    cached = null;
    return null;
  }
  return cached.value;
}

export function updateCachedProfile(values: Partial<CurrentProfile>): void {
  if (!cached || cached.expiresAt <= Date.now()) return;
  cached = {
    value: { ...cached.value, profile: { ...cached.value.profile, ...values } },
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
}

export async function getVerifiedCurrentProfile(): Promise<VerifiedCurrentProfile | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const sessionUserId = sessionData.session?.user.id;
  if (!sessionUserId) {
    cached = null;
    return null;
  }

  const current = getCachedVerifiedProfile();
  if (current?.user.id === sessionUserId) return current;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user || authData.user.id !== sessionUserId) return null;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, rt, no_kk, nama, nama_lengkap, nik, no_hp")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (profileError || !profile) return null;

    const value = { user: authData.user, profile: profile as CurrentProfile };
    cached = { value, expiresAt: Date.now() + CACHE_TTL_MS };
    return value;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}
