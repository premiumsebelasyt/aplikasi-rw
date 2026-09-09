"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type Kategori = {
  id: number;
  nama: string;
  jenis: "PEMASUKAN" | "PENGELUARAN";
};

const RT_LIST = ["01", "02", "03", "04", "05", "06"];

function TambahKasForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const modeAwal = searchParams.get("pengeluaran")
    ? "PENGELUARAN"
    : "PEMASUKAN";

  const [jenis, setJenis] = useState<
    "PEMASUKAN" | "PENGELUARAN"
  >(modeAwal);

  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [kategoriId, setKategoriId] = useState("");

  const [tanggal, setTanggal] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [keterangan, setKeterangan] = useState("");
  const [nominal, setNominal] = useState("");
  const [rt, setRt] = useState("");
  const [sumber, setSumber] = useState("");
  const [penerima, setPenerima] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadKategori() {
      const { data, error } = await supabase
        .from("kas_kategori")
        .select("*")
        .eq("aktif", true)
        .eq("jenis", jenis)
        .order("nama");

      if (error) {
        console.error(error);
        alert("Gagal mengambil kategori kas.");
        return;
      }

      const kategoriHasil = (data || []).filter((item) => {
        if (
          jenis === "PEMASUKAN" &&
          item.nama.toLowerCase() === "ipk bulanan"
        ) {
          return false;
        }

        return true;
      });

      setKategori(kategoriHasil);
      setKategoriId("");
    }

    loadKategori();
  }, [jenis]);

  async function simpanTransaksi() {
    if (!tanggal) {
      alert("Tanggal wajib diisi.");
      return;
    }

    if (!kategoriId) {
      alert("Kategori wajib dipilih.");
      return;
    }

    if (!keterangan.trim()) {
      alert("Keterangan wajib diisi.");
      return;
    }

    const nominalAngka = Number(
      nominal.replace(/\./g, "").replace(/,/g, "")
    );

    if (!nominalAngka || nominalAngka <= 0) {
      alert("Nominal tidak valid.");
      return;
    }

    if (saving) return;

    setSaving(true);

    const { error } = await supabase
      .from("kas_transaksi")
      .insert({
        tanggal,
        jenis,
        kategori_id: Number(kategoriId),
        keterangan: keterangan.trim(),
        nominal: nominalAngka,
        rt: rt || null,
        sumber:
          jenis === "PEMASUKAN"
            ? sumber.trim() || null
            : null,
        penerima:
          jenis === "PENGELUARAN"
            ? penerima.trim() || null
            : null,
      });

    if (error) {
      console.error(error);
      alert(`Gagal menyimpan transaksi: ${error.message}`);
      setSaving(false);
      return;
    }

    alert(
      jenis === "PEMASUKAN"
        ? "Pemasukan berhasil disimpan."
        : "Pengeluaran berhasil disimpan."
    );

    router.push("/kas");
    router.refresh();
  }

  const isPemasukan = jenis === "PEMASUKAN";

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-2xl px-4 py-5">

        {/* HEADER */}
        <div
          className={`mb-5 overflow-hidden rounded-3xl p-5 text-white shadow-sm ${
            isPemasukan
              ? "bg-emerald-600"
              : "bg-rose-600"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium opacity-90">
                Kas RW 16
              </p>

              <h1 className="mt-1 text-2xl font-bold">
                {isPemasukan
                  ? "＋ Tambah Pemasukan"
                  : "− Tambah Pengeluaran"}
              </h1>

              <p className="mt-2 text-sm opacity-90">
                {isPemasukan
                  ? "Catat pemasukan selain IPK bulanan."
                  : "Catat uang yang keluar dari Kas RW 16."}
              </p>
            </div>

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold">
              {isPemasukan ? "+" : "−"}
            </div>
          </div>
        </div>

        {/* KEMBALI */}
        <div className="mb-4">
          <Link
            href="/kas"
            className="inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200"
          >
            ← Kembali ke Kas
          </Link>
        </div>

        {/* PILIH JENIS */}
        <div className="mb-5 grid grid-cols-2 gap-3">

          <button
            type="button"
            onClick={() => setJenis("PEMASUKAN")}
            className={`rounded-2xl border-2 p-4 text-left transition ${
              isPemasukan
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            <div className="mb-1 text-2xl font-bold">
              ＋
            </div>

            <div className="font-bold">
              Pemasukan
            </div>

            <div className="mt-1 text-xs">
              Selain IPK bulanan
            </div>
          </button>

          <button
            type="button"
            onClick={() => setJenis("PENGELUARAN")}
            className={`rounded-2xl border-2 p-4 text-left transition ${
              !isPemasukan
                ? "border-rose-500 bg-rose-50 text-rose-700"
                : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            <div className="mb-1 text-2xl font-bold">
              −
            </div>

            <div className="font-bold">
              Pengeluaran
            </div>

            <div className="mt-1 text-xs">
              Uang keluar
            </div>
          </button>

        </div>

        {/* FORM */}
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">

          {/* FORM HEADER */}
          <div
            className={`border-b px-5 py-4 ${
              isPemasukan
                ? "border-emerald-100 bg-emerald-50"
                : "border-rose-100 bg-rose-50"
            }`}
          >
            <p
              className={`text-xs font-bold uppercase tracking-wider ${
                isPemasukan
                  ? "text-emerald-600"
                  : "text-rose-600"
              }`}
            >
              {isPemasukan
                ? "TRANSAKSI PEMASUKAN LAINNYA"
                : "TRANSAKSI UANG KELUAR"}
            </p>

            <h2 className="mt-1 text-lg font-bold text-slate-900">
              {isPemasukan
                ? "Detail Pemasukan"
                : "Detail Pengeluaran"}
            </h2>

            {isPemasukan && (
              <p className="mt-1 text-xs text-slate-500">
                Gunakan menu ini untuk pemasukan selain IPK
                bulanan warga.
              </p>
            )}
          </div>

          <div className="space-y-5 p-5">

            {/* TANGGAL */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Tanggal
              </label>

              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-slate-500"
              />
            </div>

            {/* KATEGORI */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Kategori
              </label>

              <select
                value={kategoriId}
                onChange={(e) => setKategoriId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none focus:border-slate-500"
              >
                <option value="">
                  Pilih kategori
                </option>

                {kategori.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nama}
                  </option>
                ))}
              </select>

              {isPemasukan && (
                <p className="mt-2 text-xs text-slate-500">
                  IPK bulanan tidak dicatat di sini.
                  Gunakan menu IPK Warga.
                </p>
              )}
            </div>

            {/* KETERANGAN */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Keterangan
              </label>

              {isPemasukan && (
                <div className="mb-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">
                  <span className="font-bold">
                    Info:
                  </span>{" "}
                  input pemasukan selain IPK bulanan, seperti
                  sumbangan, bantuan, donasi, atau pemasukan
                  lainnya.
                </div>
              )}

              <textarea
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder={
                  isPemasukan
                    ? "Contoh: Sumbangan warga untuk kegiatan 17 Agustus"
                    : "Contoh: Pembelian lampu jalan RT 03"
                }
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-slate-500"
              />
            </div>

            {/* NOMINAL */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Nominal
              </label>

              <div
                className={`flex overflow-hidden rounded-xl border-2 ${
                  isPemasukan
                    ? "border-emerald-200"
                    : "border-rose-200"
                }`}
              >
                <span
                  className={`flex items-center px-4 font-bold ${
                    isPemasukan
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-rose-50 text-rose-600"
                  }`}
                >
                  Rp
                </span>

                <input
                  type="text"
                  inputMode="numeric"
                  value={nominal}
                  onChange={(e) => {
                    const angka = e.target.value.replace(
                      /\D/g,
                      ""
                    );

                    setNominal(
                      angka
                        ? Number(angka).toLocaleString("id-ID")
                        : ""
                    );
                  }}
                  placeholder="0"
                  className="w-full px-4 py-3 outline-none"
                />
              </div>
            </div>

            {/* RT */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                RT
                <span className="ml-1 font-normal text-slate-400">
                  (opsional)
                </span>
              </label>

              <select
                value={rt}
                onChange={(e) => setRt(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none focus:border-slate-500"
              >
                <option value="">
                  Semua / Tidak terkait RT tertentu
                </option>

                {RT_LIST.map((item) => (
                  <option key={item} value={item}>
                    RT {item}
                  </option>
                ))}
              </select>
            </div>

            {/* SUMBER PEMASUKAN */}
            {isPemasukan && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Sumber Pemasukan
                  <span className="ml-1 font-normal text-slate-400">
                    (opsional)
                  </span>
                </label>

                <input
                  type="text"
                  value={sumber}
                  onChange={(e) => setSumber(e.target.value)}
                  placeholder="Contoh: Warga RT 02 / Donatur / Kelurahan"
                  className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {/* PENERIMA PENGELUARAN */}
            {!isPemasukan && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Penerima
                  <span className="ml-1 font-normal text-slate-400">
                    (opsional)
                  </span>
                </label>

                <input
                  type="text"
                  value={penerima}
                  onChange={(e) => setPenerima(e.target.value)}
                  placeholder="Contoh: Toko Bangunan / Pak Budi"
                  className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-rose-500"
                />
              </div>
            )}

            {/* SIMPAN */}
            <button
              type="button"
              onClick={simpanTransaksi}
              disabled={saving}
              className={`w-full rounded-2xl px-4 py-4 font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                isPemasukan
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {saving
                ? "Menyimpan..."
                : isPemasukan
                ? "＋ Simpan Pemasukan"
                : "− Simpan Pengeluaran"}
            </button>

          </div>
        </section>
      </div>
    </main>
  );
}

export default function TambahKasPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-100 p-5">
          <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 text-center">
            Memuat form kas...
          </div>
        </main>
      }
    >
      <TambahKasForm />
    </Suspense>
  );
}