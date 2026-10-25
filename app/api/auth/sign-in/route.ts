import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseAdmin, createSupabaseUserClient } from "@/lib/supabase/admin";
import { staffLoginIdentity, staffProfileMatches } from "@/lib/auth/staff-login";
import { isActiveProfile } from "@/lib/auth/profile-status.mjs";

export const runtime = "nodejs";

const invalidCredentials = () => NextResponse.json({ error: "Username atau password tidak cocok." }, { status: 401 });
const allowedRoles = new Set(["WARGA", "RT", "RW", "BENDAHARA", "ADMIN"]);

export async function POST(request: Request) {
  let body: { identifier?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan login tidak valid." }, { status: 400 });
  }

  const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!identifier || !password || identifier.length > 64 || password.length > 1024) {
    return NextResponse.json({ error: "Username atau password tidak cocok." }, { status: 401 });
  }

  const isWarga = /^\d{16}$/.test(identifier);
  const staffIdentity = isWarga ? null : staffLoginIdentity(identifier);
  if (!isWarga && !staffIdentity) return invalidCredentials();

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
    if (!url || !anonKey) {
      return NextResponse.json({ error: "Layanan login belum dikonfigurasi." }, { status: 503 });
    }

    let email: string;
    if (isWarga) {
      const admin = createSupabaseAdmin();
      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .select("id, role, aktif")
        .eq("role", "WARGA")
        .eq("no_kk", identifier)
        .maybeSingle();

      if (profileError) {
        console.error("Login profile lookup failed:", profileError.code);
        return NextResponse.json({ error: "Layanan login belum siap. Periksa konfigurasi database aplikasi RW." }, { status: 503 });
      }
      if (!profile || !isActiveProfile(profile)) return invalidCredentials();

      const { data: account, error: accountError } = await admin.auth.admin.getUserById(profile.id);
      if (accountError || !account.user?.email) {
        console.error("Login account lookup failed:", accountError?.status ?? "account_lookup_failed");
        return invalidCredentials();
      }
      email = account.user.email;
    } else {
      email = staffIdentity!.email;
    }

    const auth = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: session, error: passwordError } = await auth.auth.signInWithPassword({ email, password });
    if (passwordError || !session.session) {
      console.warn("Sign-in rejected at Auth stage:", {
        status: typeof passwordError?.status === "number" ? passwordError.status : 0,
        code: typeof passwordError?.code === "string" && /^[a-z0-9_-]{1,60}$/i.test(passwordError.code)
          ? passwordError.code
          : "unknown",
      });
      return invalidCredentials();
    }

    const profileClient = createSupabaseUserClient(session.session.access_token);
    const { data: verifiedProfile, error: profileError } = await profileClient
      .from("profiles")
      .select("id, role, rt, aktif, no_kk")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Login role verification failed:", profileError.code);
      return NextResponse.json({ error: "Layanan login belum siap. Periksa konfigurasi database aplikasi RW." }, { status: 503 });
    }
    if (!verifiedProfile || !isActiveProfile(verifiedProfile) || !allowedRoles.has(verifiedProfile.role)) {
      return invalidCredentials();
    }
    if (isWarga && (verifiedProfile.role !== "WARGA" || verifiedProfile.no_kk !== identifier)) {
      return invalidCredentials();
    }
    if (staffIdentity && !staffProfileMatches(staffIdentity, verifiedProfile)) {
      console.error("Sign-in profile mapping mismatch:", "staff_role_or_scope_mismatch");
      return invalidCredentials();
    }

    return NextResponse.json({
      role: verifiedProfile.role,
      rt: verifiedProfile.role === "RT" ? verifiedProfile.rt : null,
      session: {
        access_token: session.session.access_token,
        refresh_token: session.session.refresh_token,
      },
    });
  } catch (error) {
    console.error("Login service unavailable:", error instanceof Error ? error.name : "unknown_error");
    return NextResponse.json({ error: "Layanan login belum dikonfigurasi." }, { status: 503 });
  }
}
