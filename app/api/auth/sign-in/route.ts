import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { staffAuthEmail } from "@/lib/auth/staff-login";

export const runtime = "nodejs";

const allowedRoles = ["WARGA", "RT", "RW", "BENDAHARA", "ADMIN"] as const;
type LoginRole = (typeof allowedRoles)[number];

export async function POST(request: Request) {
  let body: { role?: string; identifier?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan login tidak valid." }, { status: 400 });
  }

  const role = body.role as LoginRole | undefined;
  const identifier = body.identifier?.trim();
  const password = body.password;
  if (!role || !allowedRoles.includes(role) || !identifier || !password) {
    return NextResponse.json({ error: "Jenis akun, ID, dan password wajib diisi." }, { status: 400 });
  }

  try {
    const admin = createSupabaseAdmin();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
    if (!url || !anonKey) {
      return NextResponse.json({ error: "Layanan login belum dikonfigurasi." }, { status: 503 });
    }

    let email: string;
    let wargaProfile: { id: string; role: string } | null = null;
    if (role === "WARGA") {
      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .select("id, role")
        .eq("role", role)
        .eq("no_kk", identifier)
        .maybeSingle();

      if (profileError) {
        console.error("Login profile lookup failed:", profileError.code);
        return NextResponse.json({ error: "Layanan login belum siap. Periksa konfigurasi database aplikasi RW." }, { status: 503 });
      }
      if (!profile) {
        return NextResponse.json({ error: "ID atau password tidak cocok." }, { status: 401 });
      }

      const { data: account, error: accountError } = await admin.auth.admin.getUserById(profile.id);
      if (accountError || !account.user?.email) {
        console.error("Login account lookup failed:", accountError?.status ?? "email_missing");
        return NextResponse.json({ error: "ID atau password tidak cocok." }, { status: 401 });
      }
      email = account.user.email;
      wargaProfile = profile;
    } else {
      const staffEmail = staffAuthEmail(identifier);
      if (!staffEmail) {
        return NextResponse.json({ error: "ID atau password tidak cocok." }, { status: 401 });
      }
      email = staffEmail;
    }

    const auth = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: session, error: passwordError } = await auth.auth.signInWithPassword({
      email,
      password,
    });
    if (passwordError || !session.session) {
      return NextResponse.json({ error: "ID atau password tidak cocok." }, { status: 401 });
    }

    let verifiedProfile = wargaProfile;
    if (role !== "WARGA") {
      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .select("id, role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Login role verification failed:", profileError.code);
        return NextResponse.json({ error: "Layanan login belum siap. Periksa konfigurasi database aplikasi RW." }, { status: 503 });
      }
      if (!profile || profile.role !== role) {
        return NextResponse.json({ error: "ID atau password tidak cocok." }, { status: 401 });
      }
      verifiedProfile = profile;
    }

    return NextResponse.json({
      role: verifiedProfile?.role,
      session: {
        access_token: session.session.access_token,
        refresh_token: session.session.refresh_token,
      },
    });
  } catch (error) {
    console.error("Login service unavailable:", error instanceof Error ? error.message : "unknown_error");
    return NextResponse.json({ error: "Layanan login belum dikonfigurasi." }, { status: 503 });
  }
}
