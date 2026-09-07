"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  no_kk: string | null;
  alamat: string | null;
};

type DetailSurat = Surat & {
  warga: Warga | null;
};

export default function ReviewSuratRW({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [surat, setSurat] = useState<DetailSurat | null>(null);
  const [loading, setLoading] = useState(true);
  const [proses, setProses] = useState(false);
  const [pesan, setPesan] = useState("");

  useEffect(() => {
    async function ambilData() {
      const { id } = await params;
      const suratId = Number(id);

      if (!suratId) {
        setPesan("ID surat tidak valid.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("surat")
        .select("*")
        .eq("id", suratId)
        .maybeSingle();

      if (error) {
        console.error(error);
        setPesan("Gagal mengambil data surat.");
        setLoading(false);
        return;
      }

      if (!data) {
        setPesan("Surat tidak ditemukan.");
        setLoading(false);
        return;
      }

      let warga: Warga | null = null;

      if (data.warga_id) {
        const { data: wargaData } = await supabase
          .from("warga")
          .select("id, nama, nik, no_kk, alamat")
          .eq("id", data.warga_id)
          .maybeSingle();

        warga = wargaData;
      }

      setSurat({
        ...data,
        warga,
      });

      setLoading(false);
    }

    ambilData();
  }, [params]);

  function formatJenis(jenis: string) {
    return jenis
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (huruf) => huruf.toUpperCase());
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

  async function setujuiSurat() {
    if (!surat || proses) return;

    const yakin = window.confirm(
      "Yakin ingin menyetujui surat ini?\n\n" +
        "Setelah disetujui, surat akan masuk ke tahap TTD RW."
    );

    if (!yakin) return;

    setProses(true);
    setPesan("");

    const { error } = await supabase
      .from("surat")
      .update({
        status: "DISETUJUI",
      })
      .eq("id", surat.id)
      .eq("status", "MENUNGGU_RW");

    if (error) {
      console.error(error);
      setPesan("Gagal menyetujui surat: " + error.message);
      setProses(false);
      return;
    }

    setSurat({
      ...surat,
      status: "DISETUJUI",
    });

    setPesan("Surat berhasil disetujui. Silakan lanjut ke TTD RW.");
    setProses(false);
  }

  async function tolakSurat() {
    if (!surat || proses) return;

    const alasan = window.prompt(
      "Masukkan alasan penolakan surat:"
    );

    if (alasan === null) return;

    const alasanBersih = alasan.trim();

    if (!alasanBersih) {
      window.alert("Alasan penolakan wajib diisi.");
      return;
    }

    const yakin = window.confirm(
      "Yakin ingin menolak surat ini?\n\n" +
        "Alasan penolakan:\n" +
        alasanBersih
    );

    if (!yakin) return;

    setProses(true);
    setPesan("");

    const { error } = await supabase
      .from("surat")
      .update({
        status: "DITOLAK",
      })
      .eq("id", surat.id)
      .eq("status", "MENUNGGU_RW");

    if (error) {
      console.error(error);
      setPesan("Gagal menolak surat: " + error.message);
      setProses(false);
      return;
    }

    setSurat({
      ...surat,
      status: "DITOLAK",
    });

    setPesan(
      `Surat ditolak. Alasan: ${alasanBersih}`
    );

    setProses(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-5">
        <div className="mx-auto max-w-xl">
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-gray-500">
              Memuat detail surat...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!surat) {
    return (
      <main className="min-h-screen bg-gray-100 p-5">
        <div className="mx-auto max-w-xl">
          <Link
            href="/rw/surat"
            className="mb-4 inline-block text-sm font-semibold text-blue-600"
          >
            ← Kembali ke Surat Masuk RW
          </Link>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="font-semibold text-red-600">
              {pesan || "Surat tidak ditemukan."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const masihMenunggu =
    surat.status === "MENUNGGU_RW";

  const sudahDisetujui =
    surat.status === "DISETUJUI";

  const sudahDitolak =
    surat.status === "DITOLAK";

  return (
    <main className="min-h-screen bg-gray-100 pb-10">
      {/* Header */}
      <header className="bg-blue-700 px-5 py-6 text-white">
        <div className="mx-auto max-w-xl">
          <Link
            href="/rw/surat"
            className="text-sm text-blue-100"
          >
            ← Surat Masuk RW
          </Link>

          <h1 className="mt-3 text-2xl font-bold">
            Review Surat
          </h1>

          <p className="mt-1 text-sm text-blue-100">
            Pemeriksaan surat yang diajukan RT
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-5">
        {/* Status */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Status Surat
          </p>

          <div className="mt-2">
            {surat.status === "MENUNGGU_RW" && (
              <span className="inline-block rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-700">
                MENUNGGU REVIEW RW
              </span>
            )}

            {surat.status === "DISETUJUI" && (
              <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                DISETUJUI
              </span>
            )}

            {surat.status === "DITOLAK" && (
              <span className="inline-block rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
                DITOLAK
              </span>
            )}
          </div>
        </div>

        {/* Informasi Surat */}
        <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800">
            Informasi Surat
          </h2>

          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs text-gray-500">
                Jenis Surat
              </p>

              <p className="mt-1 font-semibold text-gray-800">
                {formatJenis(surat.jenis_surat)}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Keperluan
              </p>

              <p className="mt-1 text-gray-800">
                {surat.keperluan || "-"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Wilayah
              </p>

              <p className="mt-1 font-semibold text-gray-800">
                RT {surat.rt} / RW {surat.rw}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Diajukan
              </p>

              <p className="mt-1 text-gray-800">
                {formatTanggal(surat.created_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Data Warga */}
        <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800">
            Data Pemohon
          </h2>

          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs text-gray-500">
                Nama Lengkap
              </p>

              <p className="mt-1 text-lg font-semibold text-gray-800">
                {surat.warga?.nama || "-"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                NIK
              </p>

              <p className="mt-1 font-mono text-gray-800">
                {surat.warga?.nik || "-"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Nomor KK
              </p>

              <p className="mt-1 font-mono text-gray-800">
                {surat.warga?.no_kk || "-"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Alamat
              </p>

              <p className="mt-1 text-gray-800">
                {surat.warga?.alamat || "-"}
              </p>
            </div>
          </div>
        </div>

        {/* TTD RT */}
        <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800">
            Pengesahan RT
          </h2>

          {surat.ttd_rt ? (
            <div className="mt-4 rounded-xl bg-green-50 p-4">
              <p className="font-semibold text-green-700">
                ✓ Sudah ditandatangani RT
              </p>

              <p className="mt-2 text-sm text-gray-700">
                Nama: {surat.ttd_rt_nama || "-"}
              </p>

              {surat.ttd_rt_at && (
                <p className="mt-1 text-xs text-gray-500">
                  {formatTanggal(surat.ttd_rt_at)}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-xl bg-red-50 p-4">
              <p className="font-semibold text-red-700">
                ✕ Belum ditandatangani RT
              </p>
            </div>
          )}
        </div>

        {/* Pesan */}
        {pesan && (
          <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm text-blue-700">
            {pesan}
          </div>
        )}

        {/* Action RW */}
        {masihMenunggu && (
          <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800">
              Keputusan RW
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Periksa data pemohon dan isi surat sebelum mengambil keputusan.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={tolakSurat}
                disabled={proses}
                className="rounded-xl bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {proses ? "Memproses..." : "❌ Tolak"}
              </button>

              <button
                type="button"
                onClick={setujuiSurat}
                disabled={proses}
                className="rounded-xl bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {proses ? "Memproses..." : "✅ Setujui"}
              </button>
            </div>
          </div>
        )}

        {/* Setelah Disetujui */}
        {sudahDisetujui && (
          <div className="mt-4 rounded-2xl bg-green-50 p-5">
            <h2 className="font-bold text-green-800">
              Surat Disetujui
            </h2>

            <p className="mt-2 text-sm text-green-700">
              Surat sudah disetujui oleh RW dan siap masuk ke tahap tanda tangan RW.
            </p>

            <div className="mt-4 rounded-xl bg-white p-4">
              <p className="text-sm font-semibold text-gray-800">
                Tahap berikutnya
              </p>

              <p className="mt-1 text-sm text-gray-500">
                TTD RW → PDF Resmi → Terbit
              </p>
            </div>
          </div>
        )}

        {/* Setelah Ditolak */}
        {sudahDitolak && (
          <div className="mt-4 rounded-2xl bg-red-50 p-5">
            <h2 className="font-bold text-red-800">
              Surat Ditolak
            </h2>

            <p className="mt-2 text-sm text-red-700">
              Surat ini telah ditolak oleh RW.
            </p>
          </div>
        )}

        {/* Kembali */}
        <Link
          href="/rw/surat"
          className="mt-5 block rounded-xl border border-gray-300 bg-white px-4 py-3 text-center text-sm font-semibold text-gray-700 shadow-sm"
        >
          ← Kembali ke Surat Masuk RW
        </Link>
      </div>
    </main>
  );
}