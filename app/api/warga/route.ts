import { NextResponse } from "next/server";
import { createSupabaseAdmin, createSupabaseUserClient } from "@/lib/supabase/admin";
import { normalizeRtScope } from "@/lib/warga/rt-scope";
import { canAccessWargaList, canMutateWarga, canReadWarga } from "@/lib/auth/warga-access.mjs";
import { parseWargaCategoryIds } from "@/lib/warga/category-input.mjs";
import { isValidNIK, isValidOptionalNoKK } from "@/lib/warga/identity-validation.mjs";
import { isActiveProfile } from "@/lib/auth/profile-status.mjs";
import { databaseErrorHttpStatus } from "@/lib/http/database-error.mjs";

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
  const { data: profile, error } = await admin.from("profiles").select("role, rt, aktif").eq("id", auth.user.id).maybeSingle();
  if (error || !profile || !isActiveProfile(profile) || !canAccessWargaList(profile.role)) {
    return { response: NextResponse.json({ error: "Akses data warga tidak tersedia." }, { status: 403 }) };
  }
  const rt = profile.role === "RT" ? normalizeRtScope(profile.rt) : null;
  if (profile.role === "RT" && !rt) return { response: NextResponse.json({ error: "Wilayah tugas akun RT belum valid." }, { status: 403 }) };
  return { admin, userClient: createSupabaseUserClient(token), profile, rt };
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
      const numericId = Number(requestedId);
      if (!Number.isSafeInteger(numericId) || numericId < 1) return NextResponse.json({ error: "ID warga tidak valid." }, { status: 400 });
      query = query.eq("id", numericId);
    }
    if (profile.role === "RT") {
      query = query.eq("rt", rt as string);
    }

    const { data, error } = await query.order("nama", { ascending: true });
    if (error) throw new Error("Data warga belum dapat dimuat.");
    if (requestedId && (!data || data.length === 0)) {
      return NextResponse.json({ error: "Data warga tidak ditemukan atau di luar wilayah tugas." }, { status: 404 });
    }
    if (requestedId && !canReadWarga({ role: profile.role, profile, warga: data?.[0] })) {
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
    const { userClient, profile, rt } = access;
    let body: Record<string, unknown>;
    try {
      body = await request.json() as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Data warga tidak valid." }, { status: 400 });
    }
    if (!canMutateWarga({ role: profile.role, profile, warga: null, action: "create" })) {
      return NextResponse.json({ error: "Role ini tidak boleh menambah data warga." }, { status: 403 });
    }
    if (![body.nik, body.nama, body.alamat].every((value) => typeof value === "string" && value.trim())) {
      return NextResponse.json({ error: "NIK, nama, dan alamat wajib diisi." }, { status: 400 });
    }
    if (!isValidNIK(body.nik)) return NextResponse.json({ error: "NIK harus terdiri dari 16 digit." }, { status: 400 });
    if (!isValidOptionalNoKK(body.no_kk)) {
      return NextResponse.json({ error: "Nomor KK harus kosong atau terdiri dari 16 digit." }, { status: 400 });
    }
    const wargaRecord: Record<string, unknown> = {};
    for (const field of editableFields) if (field in body) wargaRecord[field] = body[field];
    wargaRecord.rt = profile.role === "RT" ? rt : normalizeRtScope(body.rt);
    if (!wargaRecord.rt) return NextResponse.json({ error: "RT warga tidak valid." }, { status: 400 });
    wargaRecord.status_warga = "Aktif";

    const parsedCategories = parseWargaCategoryIds(body);
    if (parsedCategories.error) return NextResponse.json({ error: parsedCategories.error }, { status: 400 });
    const { data: wargaId, error } = await userClient.rpc("save_warga_with_categories", {
      p_warga_id: null,
      p_warga: wargaRecord,
      p_category_ids: parsedCategories.ids ?? [],
    });
    if (error || !wargaId) {
      if (error?.code === "23505") return NextResponse.json({ error: "NIK tersebut sudah terdaftar." }, { status: 409 });
      console.error("Atomic warga create failed:", error?.code ?? "unknown_error");
      const status = databaseErrorHttpStatus(error?.code);
      return NextResponse.json({ error: status === 403 ? "Akses perubahan warga ditolak." : status === 400 ? "Data warga tidak valid." : "Data warga dan kategori gagal disimpan." }, { status });
    }
    return NextResponse.json({ id: wargaId }, { status: 201 });
  } catch (error) {
    console.error("Create warga failed:", error instanceof Error ? error.name : "unknown_error");
    return NextResponse.json({ error: "Data warga gagal disimpan." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  try {
    const access = await getAuthorizedProfile(request);
    if (access.response) return access.response;
    const { admin, userClient, profile, rt } = access;
    let body: Record<string, unknown>;
    try {
      body = await request.json() as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Data perubahan warga tidak valid." }, { status: 400 });
    }
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: "ID warga tidak valid." }, { status: 400 });

    let targetQuery = admin.from("warga").select("id, rt").eq("id", id);
    if (profile.role === "RT") targetQuery = targetQuery.eq("rt", rt as string);
    const { data: target, error: targetError } = await targetQuery.maybeSingle();
    if (targetError || !target) return NextResponse.json({ error: "Data warga tidak ditemukan atau di luar wilayah tugas." }, { status: 404 });
    if (!canMutateWarga({ role: profile.role, profile, warga: target, action: "update" })) {
      return NextResponse.json({ error: "Role ini tidak boleh mengubah data warga tersebut." }, { status: 403 });
    }

    const update: Record<string, unknown> = {};
    const hasEditableChanges = editableFields.some((field) => field in body);
    for (const field of editableFields) if (field in body) update[field] = body[field];
    if (profile.role === "RT") update.rt = rt;
    else if ("rt" in body) update.rt = normalizeRtScope(body.rt);
    const parsedCategories = parseWargaCategoryIds(body);
    if (parsedCategories.error) return NextResponse.json({ error: parsedCategories.error }, { status: 400 });
    if ("nik" in update && !isValidNIK(update.nik)) {
      return NextResponse.json({ error: "NIK harus terdiri dari 16 digit." }, { status: 400 });
    }
    if ("no_kk" in update && !isValidOptionalNoKK(update.no_kk)) {
      return NextResponse.json({ error: "Nomor KK harus kosong atau terdiri dari 16 digit." }, { status: 400 });
    }
    if (!hasEditableChanges && parsedCategories.ids === null) {
      return NextResponse.json({ error: "Tidak ada perubahan data yang dikirim." }, { status: 400 });
    }
    const { error: updateError } = await userClient.rpc("save_warga_with_categories", {
      p_warga_id: id,
      p_warga: update,
      p_category_ids: parsedCategories.ids,
    });
    if (updateError?.code === "23505") return NextResponse.json({ error: "NIK tersebut sudah digunakan warga lain." }, { status: 409 });
    if (updateError) {
      console.error("Atomic warga update failed:", updateError.code ?? "unknown_error");
      const status = databaseErrorHttpStatus(updateError.code);
      return NextResponse.json({ error: status === 403 ? "Akses perubahan warga ditolak." : status === 400 ? "Data warga tidak valid." : status === 404 ? "Data warga tidak ditemukan." : "Perubahan warga dan kategori gagal disimpan." }, { status });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update warga failed:", error instanceof Error ? error.name : "unknown_error");
    return NextResponse.json({ error: "Data warga gagal diubah." }, { status: 503 });
  }
}
