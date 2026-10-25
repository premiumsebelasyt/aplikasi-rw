import { NextResponse } from "next/server";
import { createSupabaseAdmin, createSupabaseUserClient } from "@/lib/supabase/admin";
import { executeSuratCommand } from "@/lib/surat/command.mjs";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match) return NextResponse.json({ error: "Sesi login diperlukan." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Permintaan perintah surat tidak valid." }, { status: 400 });
  }
  const { id } = await context.params;
  if (String(body.suratId) !== id) return NextResponse.json({ error: "ID surat tidak cocok." }, { status: 400 });

  try {
    const admin = createSupabaseAdmin();
    const { data: authData, error: authError } = await admin.auth.getUser(match[1]);
    if (authError || !authData.user) return NextResponse.json({ error: "Sesi login tidak valid." }, { status: 401 });
    const { data: profile, error: profileError } = await admin.from("profiles")
      .select("role, aktif")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (profileError || !profile?.aktif) return NextResponse.json({ error: "Profil aktif tidak ditemukan." }, { status: 403 });

    const userClient = createSupabaseUserClient(match[1]);
    const result = await executeSuratCommand({
      role: profile.role,
      body,
      rpc: async (name, args) => await userClient.rpc(name, args),
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Surat command unavailable:", error instanceof Error ? error.name : "unknown_error");
    return NextResponse.json({ error: "Perintah surat belum dapat dijalankan." }, { status: 503 });
  }
}
