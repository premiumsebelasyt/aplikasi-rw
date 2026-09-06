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
};

type Warga = {
  id: number;
  nama: string;
  nik: string;
  no_kk: string | null;
  alamat: string | null;
};

type DetailSurat = Surat & {
  warga: Warga | null;
};

export default function DetailSuratPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [surat, setSurat] = useState<DetailSurat | null>(null);
  const [loading, setLoading] = useState(true);
  const [pesan, setPesan] = useState("");

  useEffect(() => {
    ambilDetail();
  }, []);

  async function ambilDetail() {
    setLoading(true);
    setPesan("");

    try {
      const { id } = await params;
      const suratId = Number(id);

      if (!suratId) {
        throw new Error("ID surat tidak valid.");
      }

      const { data: dataSurat, error: suratError } = await supabase
        .from("surat")
        .select("*")
        .eq("id", suratId)
        .single();

      if (suratError) {
        throw suratError;
      }

      if (!dataSurat) {
        throw new Error("Surat tidak ditemukan.");
      }

      let dataWarga: Warga | null = null;

      if (dataSurat.warga_id) {
        const { data: warga, error: wargaError } = await supabase
          .from("warga")
          .select("id, nama, nik, no_kk, alamat")
          .eq("id", dataSurat.warga_id)
          .single();

        if (wargaError && wargaError.code !== "PGRST116") {
          throw wargaError;
        }

        dataWarga = warga || null;
      }

      setSurat({
        ...dataSurat,
        warga: dataWarga,
      });
    } catch (error) {
      console.error("Gagal mengambil detail surat:", error);

      if (error && typeof error === "object") {
        const err = error as {
          message?: string;
        };

        setPesan(err.message || "Gagal mengambil detail surat.");
      } else {
        setPesan(String(error));
      }
    } finally {
      setLoading(false);
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

  function formatStatus(status: string) {
    const daftar: Record<string, string> = {
      DRAFT: "Draft",
      MENUNGGU_RW: "Menunggu RW",
      DISETUJUI: "Disetujui",
      DITOLAK: "Ditolak",
      TERBIT: "Terbit",
    };

    return daftar[status] || status;
  }

  function warnaStatus(status: string) {
    switch (status) {
      case "DRAFT":
        return "bg-gray-100 text-gray-700";

      case "MENUNGGU_RW":
        return "bg-yellow-50 text-yellow-700";

      case "DISETUJUI":
        return "bg-green-50 text-green-700";

      case "DITOLAK":
        return "bg-red-50 text-red-700";

      case "TERBIT":
        return "bg-blue-50 text-blue-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  function formatTanggal(tanggal: string) {
    return new Date(tanggal).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100">
        <div className="mx-auto max-w-xl px-4 py-10">
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-gray-500">
              Memuat detail surat...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (pesan || !surat) {
    return (
      <main className="min-h-screen bg-gray-100">
        <div className="mx-auto max-w-xl px-4 py-10">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h1 className="text-xl font-bold text-gray-800">
              Surat Tidak Ditemukan
            </h1>

            <p className="mt-2 text-sm text-red-600">
              {pesan || "Data surat tidak tersedia."}
            </p>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/surat";
              }}
              className="mt-5 w-full rounded-xl bg-gray-800 px-4 py-3 text-sm font-bold text-white"
            >
              Kembali ke Daftar Surat
            </button>
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
              window.location.href = "/surat";
            }}
            className="text-sm font-semibold text-blue-100"
          >
            ← Kembali ke Daftar Surat
          </button>

          <p className="mt-5 text-sm text-blue-100">
            Sistem Administrasi RW 16
          </p>

          <h1 className="mt-1 text-2xl font-bold">
            Detail Surat
          </h1>

          <p className="mt-1 text-sm text-blue-100">
            Surat #{surat.id}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-5">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-gray-400">
                JENIS SURAT
              </p>

              <h2 className="mt-1 text-xl font-bold text-gray-800">
                {formatJenisSurat(surat.jenis_surat)}
              </h2>
            </div>

            <span
              className={
                "shrink-0 rounded-full px-3 py-1 text-xs font-bold " +
                warnaStatus(surat.status)
              }
            >
              {formatStatus(surat.status)}
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800">
            Data Warga
          </h2>

          {surat.warga ? (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs text-gray-400">
                  Nama
                </p>

                <p className="mt-1 font-semibold text-gray-800">
                  {surat.warga.nama}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400">
                  NIK
                </p>

                <p className="mt-1 font-semibold text-gray-800">
                  {surat.warga.nik}
                </p>
              </div>

              {surat.warga.no_kk && (
                <div>
                  <p className="text-xs text-gray-400">
                    No. KK
                  </p>

                  <p className="mt-1 font-semibold text-gray-800">
                    {surat.warga.no_kk}
                  </p>
                </div>
              )}

              {surat.warga.alamat && (
                <div>
                  <p className="text-xs text-gray-400">
                    Alamat
                  </p>

                  <p className="mt-1 text-sm leading-5 text-gray-700">
                    {surat.warga.alamat}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-red-600">
              Data warga tidak ditemukan.
            </p>
          )}
        </div>

        <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800">
            Informasi Surat
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400">
                RT
              </p>

              <p className="mt-1 font-semibold text-gray-800">
                RT {surat.rt}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-400">
                RW
              </p>

              <p className="mt-1 font-semibold text-gray-800">
                RW {surat.rw}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs text-gray-400">
              Tanggal Dibuat
            </p>

            <p className="mt-1 font-semibold text-gray-800">
              {formatTanggal(surat.created_at)}
            </p>
          </div>

          {surat.keperluan && (
            <div className="mt-4">
              <p className="text-xs text-gray-400">
                Keperluan
              </p>

              <div className="mt-2 rounded-xl bg-gray-50 p-4">
                <p className="text-sm leading-6 text-gray-700">
                  {surat.keperluan}
                </p>
              </div>
            </div>
          )}
        </div>

        {surat.status === "DRAFT" && (
          <div className="mt-4 rounded-2xl bg-yellow-50 p-5">
            <p className="font-bold text-yellow-800">
              Status Draft
            </p>

            <p className="mt-1 text-sm leading-5 text-yellow-700">
              Surat masih dalam tahap penyusunan dan belum
              dikirim ke RW.
            </p>
          </div>
        )}

        {surat.status === "MENUNGGU_RW" && (
          <div className="mt-4 rounded-2xl bg-blue-50 p-5">
            <p className="font-bold text-blue-800">
              Menunggu Persetujuan RW
            </p>

            <p className="mt-1 text-sm leading-5 text-blue-700">
              Surat sudah diajukan dan sedang menunggu
              pemeriksaan serta persetujuan RW.
            </p>
          </div>
        )}

        {surat.status === "DISETUJUI" && (
          <div className="mt-4 rounded-2xl bg-green-50 p-5">
            <p className="font-bold text-green-800">
              Surat Disetujui
            </p>

            <p className="mt-1 text-sm leading-5 text-green-700">
              Surat sudah disetujui oleh RW.
            </p>
          </div>
        )}

        {surat.status === "DITOLAK" && (
          <div className="mt-4 rounded-2xl bg-red-50 p-5">
            <p className="font-bold text-red-800">
              Surat Ditolak
            </p>

            <p className="mt-1 text-sm leading-5 text-red-700">
              Surat membutuhkan perbaikan sebelum dapat
              diajukan kembali.
            </p>
          </div>
        )}

        {surat.status === "TERBIT" && (
          <div className="mt-4 rounded-2xl bg-blue-50 p-5">
            <p className="font-bold text-blue-800">
              Surat Telah Terbit
            </p>

            <p className="mt-1 text-sm leading-5 text-blue-700">
              Surat resmi telah diterbitkan.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}