import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizeRtScope } from "@/lib/warga/rt-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const editableFields = [
  "nik", "no_kk", "nama", "alamat", "rt", "jenis_kelamin", "tempat_lahir",
  "tanggal_lahir", "agama", "status_perkawinan", "no_hp", "pendidikan",
  "pekerjaan", "status_tinggal", "status_warga",
] as const;

async function getAuthorizedProfile(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return { response: NextResponse.json({ error: "Sesi login diperlukan." }, { status: 401 }) };
  const admin = createSupabaseAdmin();
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return { response: NextResponse.json({ error: "Sesi login tidak valid." }, { status: 401 }) };
  const { data: profile, error } = await admin.from("profiles").select("role, rt").eq("id", auth.user.id).maybeSingle();
  if (error || !profile || !["RT", "RW", "ADMIN"].includes(profile.role)) {
    return { response: NextResponse.json({ error: "Akses data warga tidak tersedia." }, { status: 403 }) };
  }
  const rt = profile.role === "RT" ? normalizeRtScope(profile.rt) : null;
  if (profile.role === "RT" && !rt) return { response: NextResponse.json({ error: "Wilayah tugas akun RT belum valid." }, { status: 403 }) };
  return { admin, profile, rt };
}

export async function GET(request: Request) {
  try {
    const access = await getAuthorizedProfile(request);
    if (access.response) return access.response;
    const { admin, profile, rt } = access;

    const requestedId = new URL(request.url).searchParams.get("id");
    let query = admin.from("warga").select("*");
    if (requestedId) {
      if (!/^\d+$/.test(requestedId)) return NextResponse.json({ error: "ID warga tidak valid." }, { status: 400 });
      query = query.eq("id", Number(requestedId));
    }
    if (profile.role === "RT") {
      query = query.eq("rt", rt as string);
    }

    const { data, error } = await query.order("nama", { ascending: true });
    if (error) throw new Error("Data warga belum dapat dimuat.");
    if (requestedId && (!data || data.length === 0)) {
      return NextResponse.json({ error: "Data warga tidak ditemukan atau di luar wilayah tugas." }, { status: 404 });
    }

    return NextResponse.json({ role: profile.role, rt, warga: data ?? [] });
  } catch (error) {
    console.error("Scoped warga lookup failed:", error instanceof Error ? error.message : "unknown_error");
    return NextResponse.json({ error: "Data warga belum dapat dimuat." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const access = await getAuthorizedProfile(request);
    if (access.response) return access.response;
    const { admin, profile, rt } = access;
    const body = await request.json() as Record<string, unknown>;
    if (!body.nik || !body.nama || !body.alamat) return NextResponse.json({ error: "NIK, nama, dan alamat wajib diisi." }, { status: 400 });
    const wargaRecord: Record<string, unknown> = {};
    for (const field of editableFields) if (field in body) wargaRecord[field] = body[field];
    wargaRecord.rt = profile.role === "RT" ? rt : normalizeRtScope(body.rt);
    if (!wargaRecord.rt) return NextResponse.json({ error: "RT warga tidak valid." }, { status: 400 });
    wargaRecord.status_warga = "Aktif";

    const { data: warga, error } = await admin.from("warga").insert(wargaRecord).select("id").single();
    if (error || !warga) {
      if (error?.code === "23505") return NextResponse.json({ error: "NIK tersebut sudah terdaftar." }, { status: 409 });
      throw new Error("Data warga gagal disimpan.");
    }
    const categories = Array.isArray(body.kategori_ids) ? [...new Set(body.kategori_ids.map(Number).filter(Number.isInteger))] : [];
    if (categories.length) {
      const { error: categoryError } = await admin.from("warga_kategori").insert(categories.map((kategori_id) => ({ warga_id: warga.id, kategori_id })));
      if (categoryError) throw new Error("Data warga tersimpan, tetapi kategori belum berhasil disimpan.");
    }
    return NextResponse.json({ id: warga.id }, { status: 201 });
  } catch (error) {
    console.error("Create warga failed:", error instanceof Error ? error.message : "unknown_error");
    return NextResponse.json({ error: error instanceof Error ? error.message : "Data warga gagal disimpan." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  try {
    const access = await getAuthorizedProfile(request);
    if (access.response) return access.response;
    const { admin, profile, rt } = access;
    const body = await request.json() as Record<string, unknown>;
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: "ID warga tidak valid." }, { status: 400 });

    let targetQuery = admin.from("warga").select("id, rt").eq("id", id);
    if (profile.role === "RT") targetQuery = targetQuery.eq("rt", rt as string);
    const { data: target, error: targetError } = await targetQuery.maybeSingle();
    if (targetError || !target) return NextResponse.json({ error: "Data warga tidak ditemukan atau di luar wilayah tugas." }, { status: 404 });

    const update: Record<string, unknown> = {};
    for (const field of editableFields) if (field in body) update[field] = body[field];
    update.rt = profile.role === "RT" ? rt : normalizeRtScope(body.rt);
    if (!update.rt) return NextResponse.json({ error: "RT warga tidak valid." }, { status: 400 });
    update.updated_at = new Date().toISOString();
    let updateQuery = admin.from("warga").update(update).eq("id", id);
    if (profile.role === "RT") updateQuery = updateQuery.eq("rt", rt as string);
    const { error: updateError } = await updateQuery;
    if (updateError) throw new Error(updateError.code === "23505" ? "NIK tersebut sudah digunakan warga lain." : "Perubahan data warga gagal disimpan.");

    if (Array.isArray(body.kategori_ids)) {
      const categoryIds = [...new Set(body.kategori_ids.map(Number).filter(Number.isInteger))];
      const { error: removeError } = await admin.from("warga_kategori").delete().eq("warga_id", id);
      if (removeError) throw new Error("Data warga berubah, tetapi kategori lama gagal diperbarui.");
      if (categoryIds.length) {
        const { error: insertError } = await admin.from("warga_kategori").insert(categoryIds.map((kategori_id) => ({ warga_id: id, kategori_id })));
        if (insertError) throw new Error("Data warga berubah, tetapi kategori baru gagal diperbarui.");
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update warga failed:", error instanceof Error ? error.message : "unknown_error");
    return NextResponse.json({ error: error instanceof Error ? error.message : "Data warga gagal diubah." }, { status: 503 });
  }
}
