import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const genericSignupMessage = "Jika No. KK terdaftar dan email dapat digunakan, tautan verifikasi akan dikirim. Periksa inbox email.";

export async function POST(request: Request) {
  let body: { no_kk?: string; email?: string; no_hp?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Data pendaftaran tidak valid." }, { status: 400 });
  }

  const noKK = body.no_kk?.trim();
  const email = body.email?.trim().toLowerCase();
  const noHP = body.no_hp?.trim();
  const password = body.password;
  if (!noKK || !/^[0-9]{16}$/.test(noKK) || !email || !noHP || !password || password.length < 8) {
    return NextResponse.json({ error: "Isi No. KK 16 digit, email, nomor HP, dan password minimal 8 karakter." }, { status: 400 });
  }

  try {
    const admin = createSupabaseAdmin();
    const { data: warga, error: wargaError } = await admin
      .from("warga")
      .select("id")
      .eq("no_kk", noKK)
      .limit(1)
      .maybeSingle();
    if (wargaError) {
      console.error("Registration warga lookup failed:", wargaError.code);
      return NextResponse.json({ error: "Layanan pendaftaran belum siap. Periksa database aplikasi RW." }, { status: 503 });
    }
    if (!warga) {
      return NextResponse.json({ message: genericSignupMessage }, { status: 202 });
    }

    const { data: existing, error: existingError } = await admin
      .from("profiles")
      .select("id")
      .eq("no_kk", noKK)
      .eq("role", "WARGA")
      .maybeSingle();
    if (existingError) {
      console.error("Registration profile lookup failed:", existingError.code);
      return NextResponse.json({ error: "Layanan pendaftaran belum siap. Periksa konfigurasi database aplikasi RW." }, { status: 503 });
    }
    if (existing) {
      return NextResponse.json({ message: genericSignupMessage }, { status: 202 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
    if (!url || !anonKey) {
      return NextResponse.json({ error: "Layanan pendaftaran belum dikonfigurasi." }, { status: 503 });
    }

    const auth = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: signupError } = await auth.auth.signUp({
      email,
      password,
      options: { data: { no_kk: noKK, no_hp: noHP } },
    });
    if (signupError) {
      return NextResponse.json({ message: genericSignupMessage }, { status: 202 });
    }

    return NextResponse.json({ message: genericSignupMessage }, { status: 202 });
  } catch (error) {
    console.error("Registration service unavailable:", error instanceof Error ? error.message : "unknown_error");
    return NextResponse.json({ error: "Layanan pendaftaran belum dikonfigurasi." }, { status: 503 });
  }
}
