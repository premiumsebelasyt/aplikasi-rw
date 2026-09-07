"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Surat = {
  id: number;
  warga_id: number;
  jenis_surat: string;
  keperluan: string | null;
  rt: string;
  rw: string;
  status: string;
  created_at: string;
  ttd_rt: boolean;
  ttd_rt_at: string | null;
  ttd_rt_nama: string | null;
};

type Warga = {
  id: number;
  nama: string;
  nik: string;
  alamat: string | null;
};

type SuratDenganWarga = Surat & {
  warga: Warga | null;
};

export default function SuratRWPage() {
  const [surat, setSurat] = useState<SuratDenganWarga[]>([]);
  const [loading, setLoading] = useState(true);
  const [prosesId, setProsesId] = useState<number | null>(null);
  const [pesan, setPesan] = useState("");

  useEffect(() => {
    ambilSurat();
  }, []);

  async function ambilSurat() {
    setLoading(true);
    setPesan("");

    try {
      const { data: dataSurat, error: suratError } = await supabase
        .from("surat")
        .select("*")
        .eq("status", "MENUNGGU_RW")
        .order("created_at", { ascending: false });

      if (suratError) {
        throw suratError;
      }

      const daftarSurat = dataSurat || [];

      if (daftarSurat.length === 0) {
        setSurat([]);
        return;
      }

      const wargaIds = daftarSurat
        .map((item) => item.warga_id)
        .filter(Boolean);

      const { data: dataWarga, error: wargaError } = await supabase
        .from("warga")
        .select("id, nama, nik, alamat")
        .in("id", wargaIds);

      if (wargaError) {
        throw wargaError;
      }

      const daftarWarga = dataWarga || [];

      const hasil: SuratDenganWarga[] = daftarSurat.map((item) => ({
        ...item,
        warga:
          daftarWarga.find((warga) => warga.id === item.warga_id) || null,
      }));

      setSurat(hasil);
    } catch (error) {
      console.error("Gagal mengambil surat RW:", error);

      if (error && typeof error === "object") {
        const err = error as { message?: string };
        setPesan(err.message || "Gagal mengambil surat.");
      } else {
        setPesan(String(error));
      }
    } finally {
      setLoading(false);
    }
  }

  async function setujuiSurat(id: number) {
    const yakin = window.confirm(
      "Setujui surat ini?\n\nStatus surat akan berubah menjadi DISETUJUI."
    );

    if (!yakin) return;

    setProsesId(id);
    setPesan("");

    try {
      const { error } = await supabase
        .from("surat")
        .update({
          status: "DISETUJUI",
        })
        .eq("id", id)
        .eq("status", "MENUNGGU_RW");

      if (error) {
        throw error;
      }

      setSurat((daftar) =>
        daftar.filter((item) => item.id !== id)
      );

      setPesan("Surat berhasil disetujui oleh RW.");
    } catch (error) {
      console.error("Gagal menyetujui surat:", error);

      if (error && typeof error === "object") {
        const err = error as { message?: string };
        setPesan(err.message || "Gagal menyetujui surat.");
      } else {
        setPesan(String(error));
      }
    } finally {
      setProsesId(null);
    }
  }

  async function tolakSurat(id: number) {
    const alasan = window.prompt(
      "Masukkan alasan surat ditolak/perlu diperbaiki:"
    );

    if (alasan === null) {
      return;
    }

    if (!alasan.trim()) {
      setPesan("Alasan penolakan wajib diisi.");
      return;
    }

    setProsesId(id);
    setPesan("");

    try {
      const { error } = await supabase
        .from("surat")
        .update({
          status: "DITOLAK",
        })
        .eq("id", id)
        .eq("status", "MENUNGGU_RW");

      if (error) {
        throw error;
      }

      setSurat((daftar) =>
        daftar.filter((item) => item.id !== id)
      );

      setPesan(
        `Surat berhasil ditolak. Alasan: ${alasan.trim()}`
      );
    } catch (error) {
      console.error("Gagal menolak surat:", error);

      if (error && typeof error === "object") {
        const err = error as { message?: string };
        setPesan(err.message || "Gagal menolak surat.");
      } else {
        setPesan(String(error));
      }
    } finally {
      setProsesId(null);
    }
  }

  function formatJenisSurat(jenis: string) {
    const daftar: Record<string, string> = {
      "surat-pengantar": "Surat Pengantar",
      "surat-domisili": "Surat Domisili",
      "surat-keterangan-usaha": "Surat Keterangan Usaha",
      "surat-keterangan-tidak-mampu":
        "Surat Keterangan Tidak Mampu",
      "surat-keterangan-lainnya":
        "Surat Keterangan Lainnya",
    };

    return daftar[jenis] || jenis;
  }

  function formatTanggal(tanggal: string) {
    return new Date(tanggal).toLocaleString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100">
        <div className="mx-auto max-w-xl px-4 py-10">
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-gray-500">
              Memuat surat masuk RW...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 pb-10">
      <header className="bg-blue-700 px-5 py-6 text-white">
        <div className="mx-auto max-w-xl">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
            className="text-sm font-semibold text-blue-100"
          >
            ← Kembali ke Dashboard
          </button>

          <p className="mt-5 text-sm text-blue-100">
            Sistem Administrasi RW 16
          </p>

          <h1 className="mt-1 text-2xl font-bold">
            Surat Masuk RW
          </h1>

          <p className="mt-1 text-sm text-blue-100">
            Pemeriksaan dan persetujuan surat dari RT
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-5">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400">
                MENUNGGU PERSETUJUAN
              </p>

              <h2 className="mt-1 text-3xl font-bold text-gray-800">
                {surat.length}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                surat menunggu pemeriksaan RW
              </p>
            </div>

            <div className="rounded-2xl bg-yellow-50 px-4 py-3 text-center">
              <p className="text-2xl">📨</p>
              <p className="mt-1 text-xs font-bold text-yellow-700">
                Surat Masuk
              </p>
            </div>
          </div>
        </div>

        {pesan && (
          <div
            className={
              "mt-4 rounded-2xl p-4 text-sm font-semibold " +
              (pesan.includes("berhasil")
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700")
            }
          >
            {pesan}
          </div>
        )}

        {surat.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-white p-8 text-center shadow-sm">
            <div className="text-4xl">✅</div>

            <h2 className="mt-3 text-lg font-bold text-gray-800">
              Tidak Ada Surat Masuk
            </h2>

            <p className="mt-1 text-sm leading-5 text-gray-500">
              Saat ini tidak ada surat dari RT yang menunggu
              persetujuan RW.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {surat.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-400">
                      SURAT #{item.id}
                    </p>

                    <h2 className="mt-1 text-lg font-bold text-gray-800">
                      {formatJenisSurat(item.jenis_surat)}
                    </h2>
                  </div>

                  <span className="shrink-0 rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700">
                    Menunggu RW
                  </span>
                </div>

                <div className="mt-4 rounded-xl bg-gray-50 p-4">
                  <p className="text-xs text-gray-400">
                    PEMOHON
                  </p>

                  <p className="mt-1 font-bold text-gray-800">
                    {item.warga?.nama || "Data warga tidak ditemukan"}
                  </p>

                  {item.warga?.nik && (
                    <p className="mt-1 text-sm text-gray-500">
                      NIK: {item.warga.nik}
                    </p>
                  )}

                  <p className="mt-2 text-sm font-semibold text-gray-700">
                    RT {item.rt} / RW {item.rw}
                  </p>
                </div>

                {item.keperluan && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-400">
                      KEPERLUAN
                    </p>

                    <p className="mt-1 text-sm leading-5 text-gray-700">
                      {item.keperluan}
                    </p>
                  </div>
                )}

                <div className="mt-4">
                  <p className="text-xs text-gray-400">
                    TTD RT
                  </p>

                  <p className="mt-1 text-sm font-semibold text-green-700">
                    ✓ {item.ttd_rt_nama || "Sudah ditandatangani RT"}
                  </p>

                  {item.ttd_rt_at && (
                    <p className="mt-1 text-xs text-gray-400">
                      {formatTanggal(item.ttd_rt_at)}
                    </p>
                  )}
                </div>

                <p className="mt-4 text-xs text-gray-400">
                  Diajukan: {formatTanggal(item.created_at)}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    window.location.href = `/surat/${item.id}`;
                  }}
                  className="mt-4 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-700"
                >
                  👁️ Lihat Detail Surat
                </button>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      tolakSurat(item.id);
                    }}
                    disabled={prosesId === item.id}
                    className="rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {prosesId === item.id
                      ? "Memproses..."
                      : "❌ Tolak"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setujuiSurat(item.id);
                    }}
                    disabled={prosesId === item.id}
                    className="rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {prosesId === item.id
                      ? "Memproses..."
                      : "✅ Setujui"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}