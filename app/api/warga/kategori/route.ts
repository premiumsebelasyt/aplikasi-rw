import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizeRtScope } from "@/lib/warga/rt-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: "Sesi login diperlukan." }, { status: 401 });

  try {
    const admin = createSupabaseAdmin();
    const { data: auth, error: authError } = await admin.auth.getUser(token);
    if (authError || !auth.user) return NextResponse.json({ error: "Sesi login tidak valid." }, { status: 401 });

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("role, rt")
      .eq("id", auth.user.id)
      .maybeSingle();
    if (profileError || !profile || !["RT", "RW", "ADMIN"].includes(profile.role)) {
      return NextResponse.json({ error: "Akses kategori warga tidak tersedia." }, { status: 403 });
    }

    let wargaQuery = admin.from("warga").select("id, rt");
    if (profile.role === "RT") {
      const rtScope = normalizeRtScope(profile.rt);
      if (!rtScope) return NextResponse.json({ error: "Akun RT belum memiliki wilayah tugas yang valid." }, { status: 403 });
      wargaQuery = wargaQuery.eq("rt", rtScope);
    }
    const [{ data: categories, error: categoryError }, { data: residents, error: residentError }] = await Promise.all([
      admin.from("kategori_warga").select("id, nama").order("nama", { ascending: true }),
      wargaQuery,
    ]);
    if (categoryError || residentError) throw new Error("Data kategori warga belum dapat dimuat.");

    const ids = (residents ?? []).map((resident) => resident.id);
    if (ids.length === 0) return NextResponse.json({ categories: categories ?? [], relations: [] });

    const { data: relations, error: relationError } = await admin
      .from("warga_kategori")
      .select("warga_id, kategori_id")
      .in("warga_id", ids);
    if (relationError) throw new Error("Relasi kategori warga belum dapat dimuat.");

    return NextResponse.json({ categories: categories ?? [], relations: relations ?? [] });
  } catch (error) {
    console.error("Warga category lookup failed:", error instanceof Error ? error.message : "unknown_error");
    return NextResponse.json({ error: "Data kategori warga belum dapat dimuat." }, { status: 503 });
  }
}
