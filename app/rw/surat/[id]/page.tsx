"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Surat = {
  id: number;
  warga_id: number | null;
  jenis_surat: string;
  keperluan: string | null;
  rt: string | null;
  rw: string | null;
  status: string;
  created_at: string;

  ttd_rt: boolean;
  ttd_rt_at: string | null;
  ttd_rt_nama: string | null;

  ttd_rw: boolean;
  ttd_rw_at: string | null;
  ttd_rw_nama: string | null;
};

type Warga = {
  id: number;
  nik: string;
  no_kk: string | null;
  nama: string;
  alamat: string | null;
  rt: string | null;
};

function formatTanggal(tanggal: string | null) {
  if (!tanggal) return "-";

  return new Date(tanggal).toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatStatus(status: string) {
  switch (status) {
    case "MENUNGGU_RW":
      return "Menunggu Persetujuan RW";
    case "DISETUJUI":
      return "Disetujui RW";
    case "DITOLAK":
      return "Ditolak";
    case "TERBIT":
      return "Terbit";
    default:
      return status;
  }
}

export default function DetailSuratRW() {
  const params = useParams();
  const router = useRouter();

  const id = params?.id as string;

  const [surat, setSurat] = useState<Surat | null>(null);
  const [warga, setWarga] = useState<Warga | null>(null);

  const [loading, setLoading] = useState(true);
  const [proses, setProses] = useState(false);
  const [pesan, setPesan] = useState("");

  useEffect(() => {
    if (!id) return;

    async function loadData() {
      setLoading(true);
      setPesan("");

      const { data: suratData, error: suratError } = await supabase
        .from("surat")
        .select("*")
        .eq("id", id)
        .single();

      if (suratError) {
        console.error(suratError);
        setPesan("Gagal mengambil data surat: " + suratError.message);
        setLoading(false);
        return;
      }

      setSurat(suratData);

      if (suratData.warga_id) {
        const { data: wargaData, error: wargaError } = await supabase
          .from("warga")
          .select("id, nik, no_kk, nama, alamat, rt")
          .eq("id", suratData.warga_id)
          .single();

        if (!wargaError) {
          setWarga(wargaData);
        }
      }

      setLoading(false);
    }

    loadData();
  }, [id]);

  async function setujuiSurat() {
    if (!surat || proses) return;

    if (surat.status !== "MENUNGGU_RW") {
      window.alert("Surat ini sudah tidak berada pada tahap menunggu persetujuan RW.");
      return;
    }

    const yakin = window.confirm(
      "Konfirmasi Persetujuan RW\n\n" +
        "Surat ini akan disetujui dan langsung masuk ke tahap Tanda Tangan RW.\n\n" +
        "Yakin ingin menyetujui surat ini?"
    );

    if (!yakin) return;

    setProses(true);
    setPesan("");

    const { data, error } = await supabase
      .from("surat")
      .update({
        status: "DISETUJUI",
      })
      .eq("id", surat.id)
      .eq("status", "MENUNGGU_RW")
      .select("*")
      .single();

    if (error) {
      console.error(error);

      setPesan(
        "Gagal menyetujui surat: " + error.message
      );

      setProses(false);
      return;
    }

    /*
     * PENTING:
     * State langsung diubah menjadi hasil terbaru dari database.
     * Jadi bagian Pengesahan RW langsung muncul
     * tanpa reload dan tanpa kembali ke inbox.
     */
    setSurat(data);

    setPesan(
      "Surat berhasil disetujui. Silakan lanjutkan Tanda Tangan RW di bawah."
    );

    setProses(false);
  }

  async function tolakSurat() {
    if (!surat || proses) return;

    if (surat.status !== "MENUNGGU_RW") {
      window.alert("Surat ini sudah tidak berada pada tahap menunggu persetujuan RW.");
      return;
    }

    const alasan = window.prompt(
      "Masukkan alasan surat ditolak:"
    );

    if (alasan === null) return;

    const alasanBersih = alasan.trim();

    if (!alasanBersih) {
      window.alert("Alasan penolakan wajib diisi.");
      return;
    }

    const yakin = window.confirm(
      "Konfirmasi Penolakan\n\n" +
        `Alasan: ${alasanBersih}\n\n` +
        "Yakin ingin menolak surat ini?"
    );

    if (!yakin) return;

    setProses(true);
    setPesan("");

    const { data, error } = await supabase
      .from("surat")
      .update({
        status: "DITOLAK",
      })
      .eq("id", surat.id)
      .eq("status", "MENUNGGU_RW")
      .select("*")
      .single();

    if (error) {
      console.error(error);

      setPesan(
        "Gagal menolak surat: " + error.message
      );

      setProses(false);
      return;
    }

    setSurat(data);

    setPesan(
      "Surat berhasil ditolak."
    );

    setProses(false);
  }

  async function tandaTanganiRW() {
    if (!surat || proses) return;

    if (surat.status !== "DISETUJUI") {
      window.alert(
        "Surat harus disetujui terlebih dahulu."
      );
      return;
    }

    if (surat.ttd_rw) {
      window.alert(
        "Surat ini sudah ditandatangani oleh RW."
      );
      return;
    }

    const nama = window.prompt(
      "Masukkan nama Ketua RW yang menandatangani:"
    );

    if (nama === null) return;

    const namaBersih = nama.trim();

    if (!namaBersih) {
      window.alert(
        "Nama Ketua RW wajib diisi."
      );
      return;
    }

    const yakin = window.confirm(
      "Konfirmasi Tanda Tangan RW\n\n" +
        `Nama: ${namaBersih}\n\n` +
        "Yakin ingin menandatangani surat ini?"
    );

    if (!yakin) return;

    setProses(true);
    setPesan("");

    const waktuTtd = new Date().toISOString();

    const { data, error } = await supabase
      .from("surat")
      .update({
        ttd_rw: true,
        ttd_rw_at: waktuTtd,
        ttd_rw_nama: namaBersih,
      })
      .eq("id", surat.id)
      .eq("status", "DISETUJUI")
      .select("*")
      .single();

    if (error) {
      console.error(error);

      setPesan(
        "Gagal menyimpan TTD RW: " +
          error.message
      );

      setProses(false);
      return;
    }

    setSurat(data);

    setPesan(
      "TTD RW berhasil disimpan. Surat siap masuk ke tahap PDF resmi."
    );

    setProses(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-4">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            Memuat detail surat...
          </div>
        </div>
      </main>
    );
  }

  if (!surat) {
    return (
      <main className="min-h-screen bg-slate-50 p-4">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h1 className="text-xl font-bold text-slate-900">
              Surat tidak ditemukan
            </h1>

            {pesan && (
              <p className="mt-3 text-sm text-red-600">
                {pesan}
              </p>
            )}

            <button
              onClick={() => router.push("/rw/surat")}
              className="mt-5 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
            >
              Kembali ke Surat Masuk
            </button>
          </div>
        </div>
      </main>
    );
  }

  const menungguRW =
    surat.status === "MENUNGGU_RW";

  const sudahDisetujui =
    surat.status === "DISETUJUI";

  const sudahDitolak =
    surat.status === "DITOLAK";

  const sudahTerbit =
    surat.status === "TERBIT";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-4">

        {/* HEADER */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <button
            onClick={() => router.push("/rw/surat")}
            className="mb-4 text-sm font-semibold text-slate-600"
          >
            ← Surat Masuk RW
          </button>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Detail Surat
              </p>

              <h1 className="mt-1 text-2xl font-bold text-slate-900">
                {surat.jenis_surat}
              </h1>
            </div>

            <div>
              <span
                className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${
                  menungguRW
                    ? "bg-amber-100 text-amber-800"
                    : sudahDisetujui
                    ? "bg-emerald-100 text-emerald-800"
                    : sudahDitolak
                    ? "bg-red-100 text-red-800"
                    : sudahTerbit
                    ? "bg-blue-100 text-blue-800"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {formatStatus(surat.status)}
              </span>
            </div>
          </div>
        </div>

        {/* PESAN */}
        {pesan && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            {pesan}
          </div>
        )}

        {/* DATA PEMOHON */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            Data Pemohon
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">

            <div>
              <p className="text-xs text-slate-500">
                Nama
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {warga?.nama || "-"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                NIK
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {warga?.nik || "-"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                No. KK
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {warga?.no_kk || "-"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                RT / RW
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                RT {surat.rt || warga?.rt || "-"} / RW{" "}
                {surat.rw || "16"}
              </p>
            </div>

            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500">
                Alamat
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {warga?.alamat || "-"}
              </p>
            </div>

          </div>
        </div>

        {/* DETAIL SURAT */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            Detail Permohonan
          </h2>

          <div className="mt-4">
            <p className="text-xs text-slate-500">
              Keperluan
            </p>

            <div className="mt-2 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              {surat.keperluan || "-"}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs text-slate-500">
              Diajukan
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-900">
              {formatTanggal(surat.created_at)}
            </p>
          </div>
        </div>

        {/* TTD RT */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            Tanda Tangan RT
          </h2>

          {surat.ttd_rt ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="font-bold text-emerald-800">
                ✓ Sudah ditandatangani RT
              </p>

              <p className="mt-2 text-sm text-slate-700">
                Nama:{" "}
                <span className="font-semibold">
                  {surat.ttd_rt_nama || "-"}
                </span>
              </p>

              <p className="mt-1 text-sm text-slate-600">
                Waktu: {formatTanggal(surat.ttd_rt_at)}
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Surat belum ditandatangani RT.
            </div>
          )}
        </div>

        {/* KEPUTUSAN RW */}
        {menungguRW && (
          <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Pemeriksaan RW
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Periksa data surat sebelum memberikan keputusan.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                onClick={tolakSurat}
                disabled={proses}
                className="rounded-xl border-2 border-red-200 bg-white px-4 py-4 font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
              >
                ❌ Tolak
              </button>

              <button
                onClick={setujuiSurat}
                disabled={proses}
                className="rounded-xl bg-emerald-600 px-4 py-4 font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {proses
                  ? "Memproses..."
                  : "✅ Setujui Surat"}
              </button>
            </div>
          </div>
        )}

        {/* PENGESAHAN RW - LANGSUNG MUNCUL SETELAH SETUJUI */}
        {sudahDisetujui && (
          <div className="rounded-2xl border-2 border-emerald-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="text-2xl">
                ✍️
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Pengesahan RW
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Surat telah disetujui oleh RW.
                  Lanjutkan dengan tanda tangan RW
                  untuk mengesahkan surat.
                </p>
              </div>
            </div>

            {!surat.ttd_rw ? (
              <div className="mt-5">
                <div className="rounded-xl bg-amber-50 p-4">
                  <p className="font-bold text-amber-800">
                    ⏳ Menunggu Tanda Tangan RW
                  </p>

                  <p className="mt-1 text-sm text-amber-700">
                    Surat sudah disetujui dan siap
                    ditandatangani.
                  </p>
                </div>

                <button
                  onClick={tandaTanganiRW}
                  disabled={proses}
                  className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-4 font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {proses
                    ? "Menyimpan TTD..."
                    : "✍️ Tanda Tangani sebagai RW"}
                </button>
              </div>
            ) : (
              <div className="mt-5">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="font-bold text-emerald-800">
                    ✓ Surat sudah ditandatangani RW
                  </p>

                  <div className="mt-3 space-y-1 text-sm text-slate-700">
                    <p>
                      Nama Ketua RW:{" "}
                      <span className="font-semibold">
                        {surat.ttd_rw_nama || "-"}
                      </span>
                    </p>

                    <p>
                      Waktu TTD:{" "}
                      {formatTanggal(surat.ttd_rw_at)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-blue-50 p-4">
                  <p className="font-bold text-blue-800">
                    📄 Siap masuk tahap PDF resmi
                  </p>

                  <p className="mt-1 text-sm text-blue-700">
                    Tanda tangan RT dan RW sudah
                    lengkap.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DITOLAK */}
        {sudahDitolak && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <h2 className="text-lg font-bold text-red-800">
              ❌ Surat Ditolak
            </h2>

            <p className="mt-2 text-sm text-red-700">
              Surat ini telah ditolak oleh RW.
            </p>
          </div>
        )}

        {/* TERBIT */}
        {sudahTerbit && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <h2 className="text-lg font-bold text-blue-800">
              📄 Surat Telah Terbit
            </h2>

            <p className="mt-2 text-sm text-blue-700">
              Surat resmi telah diterbitkan.
            </p>
          </div>
        )}

        {/* ALUR */}
        <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-sm">
          <h2 className="text-lg font-bold">
            Alur Surat
          </h2>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span
              className={`rounded-full px-3 py-1.5 ${
                surat.status !== "DRAFT"
                  ? "bg-emerald-600"
                  : "bg-slate-700"
              }`}
            >
              ✓ DRAFT
            </span>

            <span>→</span>

            <span
              className={`rounded-full px-3 py-1.5 ${
                surat.ttd_rt
                  ? "bg-emerald-600"
                  : "bg-slate-700"
              }`}
            >
              {surat.ttd_rt ? "✓" : "○"} TTD RT
            </span>

            <span>→</span>

            <span
              className={`rounded-full px-3 py-1.5 ${
                sudahDisetujui || surat.ttd_rw
                  ? "bg-emerald-600"
                  : "bg-slate-700"
              }`}
            >
              {sudahDisetujui || surat.ttd_rw
                ? "✓"
                : "○"}{" "}
              ACC RW
            </span>

            <span>→</span>

            <span
              className={`rounded-full px-3 py-1.5 ${
                surat.ttd_rw
                  ? "bg-emerald-600"
                  : "bg-slate-700"
              }`}
            >
              {surat.ttd_rw ? "✓" : "○"} TTD RW
            </span>

            <span>→</span>

            <span
              className={`rounded-full px-3 py-1.5 ${
                sudahTerbit
                  ? "bg-emerald-600"
                  : "bg-slate-700"
              }`}
            >
              {sudahTerbit ? "✓" : "○"} PDF RESMI
            </span>
          </div>
        </div>

      </div>
    </main>
  );
}