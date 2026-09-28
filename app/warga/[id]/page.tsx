"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { ambilKategoriWarga } from "@/lib/warga/kategori";
import { ambilDataWarga } from "@/lib/warga/data";
import { useParams, useRouter } from "next/navigation";

type Kategori = {
  id: number;
  nama: string;
};

type Warga = {
  id: number;
  nik: string;
  no_kk: string | null;
  nama: string;
  alamat: string;
  rt: string;
  jenis_kelamin: string | null;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  agama: string | null;
  status_perkawinan: string | null;
  no_hp: string | null;
  pendidikan: string | null;
  pekerjaan: string | null;
  status_tinggal: string | null;
  status_warga: string | null;
};

export default function DetailWargaPage() {
  const params = useParams();
  const router = useRouter();

  const [warga, setWarga] = useState<Warga | null>(null);
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [loading, setLoading] = useState(true);
  const [pesan, setPesan] = useState("");

  const ambilData = useCallback(async () => {
    setLoading(true);
    setPesan("");

    const id = Number(params.id);

    if (!id) {
      setPesan("ID warga tidak valid.");
      setLoading(false);
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      router.replace("/login");
      return;
    }
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, rt")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (profileError || !profile || !["RT", "RW", "ADMIN"].includes(profile.role)) {
      router.replace("/login");
      return;
    }

    let dataWarga: Warga;
    try {
      const result = await ambilDataWarga<Warga>(id);
      dataWarga = result.warga[0];
    } catch (error) {
      setPesan(error instanceof Error ? error.message : "Data warga tidak ditemukan atau di luar wilayah tugas.");
      setLoading(false);
      return;
    }

    let daftarKategori: Kategori[] = [];
    try {
      const kategoriData = await ambilKategoriWarga();
      const idsKategori = new Set(kategoriData.relations.filter((relation) => relation.warga_id === id).map((relation) => relation.kategori_id));
      daftarKategori = kategoriData.categories.filter((item) => idsKategori.has(item.id));
    } catch (error) {
      setPesan(error instanceof Error ? error.message : "Gagal mengambil kategori warga.");
      setLoading(false);
      return;
    }

    setWarga(dataWarga);
    setKategori(daftarKategori);
    setLoading(false);
  }, [params.id, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void ambilData(), 0);
    return () => window.clearTimeout(timer);
  }, [ambilData]);

  function formatTanggal(tanggal: string | null) {
    if (!tanggal) return "-";

    return new Date(tanggal).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  function hitungUmur(tanggal: string | null) {
    if (!tanggal) return null;

    const lahir = new Date(tanggal);
    const sekarang = new Date();

    let umur =
      sekarang.getFullYear() -
      lahir.getFullYear();

    const belumUlangTahun =
      sekarang.getMonth() < lahir.getMonth() ||
      (sekarang.getMonth() === lahir.getMonth() &&
        sekarang.getDate() < lahir.getDate());

    if (belumUlangTahun) {
      umur--;
    }

    return umur;
  }

  return (
    <main className="min-h-screen bg-[#f5f7f4] pb-10">
      <header className="bg-emerald-900 px-5 py-5 text-white">
        <div className="mx-auto max-w-xl">
          <button
            type="button"
            onClick={() => router.push("/warga")}
            className="mb-4 text-sm font-semibold text-emerald-100"
          >
            ← Kembali ke Data Warga
          </button>

          <p className="text-sm text-emerald-100">
            Nuansa Indah Ciomas • RW 16
          </p>

          <h1 className="mt-1 text-2xl font-bold">
            Detail Warga
          </h1>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-5">
        {loading ? (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
            Memuat data warga...
          </div>
        ) : pesan ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="font-semibold text-red-600">
              {pesan}
            </p>
          </div>
        ) : !warga ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="font-semibold text-gray-700">
              Data warga tidak ditemukan.
            </p>
          </div>
        ) : (
          <>
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-3xl">
                  👤
                </div>

                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-gray-800">
                    {warga.nama}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    NIK: {warga.nik}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    RT {warga.rt} • RW 16
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  {warga.status_warga || "Aktif"}
                </span>

                {warga.jenis_kelamin && (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
                    {warga.jenis_kelamin === "L"
                      ? "Laki-laki"
                      : "Perempuan"}
                  </span>
                )}

                {hitungUmur(warga.tanggal_lahir) !==
                  null && (
                  <span className="rounded-full bg-[#f5f7f4] px-3 py-1 text-xs font-semibold text-gray-600">
                    {hitungUmur(warga.tanggal_lahir)} tahun
                  </span>
                )}
              </div>

              {kategori.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-semibold text-gray-700">
                    Kategori
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {kategori.map((item) => (
                      <span
                        key={item.id}
                        className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700"
                      >
                        🏷️ {item.nama}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-gray-800">
                Data Pribadi
              </h2>

              <div className="mt-4 divide-y divide-gray-100">
                <div className="py-3">
                  <p className="text-xs text-gray-400">
                    Nomor Kartu Keluarga
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-700">
                    {warga.no_kk || "-"}
                  </p>
                </div>

                <div className="py-3">
                  <p className="text-xs text-gray-400">
                    Tempat, Tanggal Lahir
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-700">
                    {warga.tempat_lahir || "-"},{" "}
                    {formatTanggal(warga.tanggal_lahir)}
                  </p>
                </div>

                <div className="py-3">
                  <p className="text-xs text-gray-400">
                    Agama
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-700">
                    {warga.agama || "-"}
                  </p>
                </div>

                <div className="py-3">
                  <p className="text-xs text-gray-400">
                    Status Perkawinan
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-700">
                    {warga.status_perkawinan || "-"}
                  </p>
                </div>

                <div className="py-3">
                  <p className="text-xs text-gray-400">
                    Pendidikan
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-700">
                    {warga.pendidikan || "-"}
                  </p>
                </div>

                <div className="py-3">
                  <p className="text-xs text-gray-400">
                    Pekerjaan
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-700">
                    {warga.pekerjaan || "-"}
                  </p>
                </div>

                <div className="py-3">
                  <p className="text-xs text-gray-400">
                    Nomor HP
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-700">
                    {warga.no_hp || "-"}
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-gray-800">
                Alamat
              </h2>

              <p className="mt-3 text-sm leading-6 text-gray-600">
                {warga.alamat}
              </p>

              <p className="mt-2 text-sm font-semibold text-gray-700">
                RT {warga.rt} • RW 16
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Nuansa Indah Ciomas
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
