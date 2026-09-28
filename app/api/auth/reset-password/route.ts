import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const genericMessage = "Jika data akun cocok, tautan pemulihan akan dikirim ke email terdaftar.";
const allowedRoles = ["WARGA", "RT", "RW", "BENDAHARA", "ADMIN"] as const;

export async function POST(request: Request) {
  let body: { role?: string; identifier?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const role = body.role;
  const identifier = body.identifier?.trim();
  const email = body.email?.trim().toLowerCase();
  if (!role || !allowedRoles.includes(role as (typeof allowedRoles)[number]) || !identifier || !email) {
    return NextResponse.json({ error: "Jenis akun, ID, dan email wajib diisi." }, { status: 400 });
  }

  try {
    const admin = createSupabaseAdmin();
    let query = admin.from("profiles").select("id, role").eq("role", role);
    query = role === "WARGA" ? query.eq("no_kk", identifier) : query.ilike("login_id", identifier);
    const { data: profile, error: profileError } = await query.maybeSingle();
    if (profileError) {
      console.error("Password recovery lookup failed:", profileError.code);
      return NextResponse.json({ error: "Layanan pemulihan belum siap." }, { status: 503 });
    }

    if (profile) {
      const { data: account, error: accountError } = await admin.auth.admin.getUserById(profile.id);
      if (accountError) {
        console.error("Password recovery account lookup failed:", accountError.status);
      } else if (account.user?.email?.toLowerCase() === email) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
        if (!url || !anonKey || !siteUrl) {
          return NextResponse.json({ error: "Pemulihan belum dikonfigurasi untuk aplikasi RW." }, { status: 503 });
        }
        const auth = createClient(url, anonKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { error: recoveryError } = await auth.auth.resetPasswordForEmail(email, {
          redirectTo: new URL("/auth/reset-password", siteUrl).toString(),
        });
        if (recoveryError) {
          console.error("Password recovery email failed:", recoveryError.status);
          return NextResponse.json({ error: "Email pemulihan belum dapat dikirim." }, { status: 503 });
        }
      }
    }

    return NextResponse.json({ message: genericMessage });
  } catch (error) {
    console.error("Password recovery service unavailable:", error instanceof Error ? error.message : "unknown_error");
    return NextResponse.json({ error: "Layanan pemulihan belum dikonfigurasi." }, { status: 503 });
  }
}
