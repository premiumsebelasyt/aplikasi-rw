"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type Jenis = "PEMASUKAN" | "PENGELUARAN";

type Kategori = {
  id: number;
  nama: string;
  jenis: Jenis;
  aktif: boolean;
  created_at: string;
};

export default function PengaturanKasPage() {
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [loading, setLoading] = useState(true);

  const [nama, setNama] = useState("");
  const [jenis, setJenis] =
    useState<Jenis>("PENGELUARAN");

  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] =
    useState<number | null>(null);

  async function loadKategori() {
    setLoading(true);

    const { data, error } = await supabase
      .from("kas_kategori")
      .select(
        "id, nama, jenis, aktif, created_at"
      )
      .order("jenis")
      .order("nama");

    if (error) {
      console.error(error);
      alert(
        `Gagal mengambil kategori: ${error.message}`
      );
      setLoading(false);
      return;
    }

    setKategori(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadKategori();
  }, []);

  async function tambahKategori() {
    const namaBersih = nama.trim();

    if (!namaBersih) {
      alert("Nama kategori wajib diisi.");
      return;
    }

    const sudahAda = kategori.some(
      (item) =>
        item.jenis === jenis &&
        item.nama.trim().toLowerCase() ===
          namaBersih.toLowerCase()
    );

    if (sudahAda) {
      alert(
        "Kategori dengan nama tersebut sudah ada."
      );
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("kas_kategori")
        .insert({
          nama: namaBersih,
          jenis,
          aktif: true,
        });

      if (error) {
        throw new Error(
          `Gagal menambah kategori: ${error.message}`
        );
      }

      setNama("");

      await loadKategori();

      alert("Kategori berhasil ditambahkan.");
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Gagal menambah kategori."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleKategori(
    item: Kategori
  ) {
    if (updatingId !== null) return;

    const statusBaru = !item.aktif;

    setUpdatingId(item.id);

    try {
      const { error } = await supabase
        .from("kas_kategori")
        .update({
          aktif: statusBaru,
        })
        .eq("id", item.id);

      if (error) {
        throw new Error(
          `Gagal mengubah status kategori: ${error.message}`
        );
      }

      setKategori((sebelumnya) =>
        sebelumnya.map((kategori) =>
          kategori.id === item.id
            ? {
                ...kategori,
                aktif: statusBaru,
              }
            : kategori
        )
      );
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Gagal mengubah status kategori."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const pemasukan = kategori.filter(
    (item) => item.jenis === "PEMASUKAN"
  );

  const pengeluaran = kategori.filter(
    (item) => item.jenis === "PENGELUARAN"
  );

  function tampilkanKategori(
    daftar: Kategori[]
  ) {
    if (daftar.length === 0) {
      return (
        <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
          Belum ada kategori.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {daftar.map((item) => (
          <div
            key={item.id}
            className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
              item.aktif
                ? "border-slate-200 bg-white"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="min-w-0">
              <p
                className={`break-words text-sm font-bold ${
                  item.aktif
                    ? "text-slate-800"
                    : "text-slate-400"
                }`}
              >
                {item.nama}
              </p>

              <p className="mt-1 text-[11px] font-semibold">
                {item.aktif ? (
                  <span className="text-emerald-600">
                    AKTIF
                  </span>
                ) : (
                  <span className="text-slate-400">
                    NONAKTIF
                  </span>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                toggleKategori(item)
              }
              disabled={
                updatingId === item.id
              }
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                item.aktif
                  ? "bg-red-50 text-red-600 hover:bg-red-100"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              {updatingId === item.id
                ? "..."
                : item.aktif
                ? "Nonaktifkan"
                : "Aktifkan"}
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-24">
      <div className="mx-auto max-w-5xl px-4 py-5">

        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Kas RW 16
            </p>

            <h1 className="text-2xl font-bold text-slate-900">
              Pengaturan Kas
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Kelola kategori pemasukan dan pengeluaran.
            </p>
          </div>

          <Link
            href="/kas"
            className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200"
          >
            ← Kas
          </Link>
        </div>

        <section className="mb-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">

          <div className="mb-4">
            <h2 className="font-bold text-slate-900">
              Tambah Kategori
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Kategori nonaktif tidak akan muncul pada form transaksi baru.
            </p>
          </div>

          <div className="space-y-4">

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Jenis
              </label>

              <div className="grid grid-cols-2 gap-2">

                <button
                  type="button"
                  onClick={() =>
                    setJenis("PEMASUKAN")
                  }
                  className={`rounded-xl px-4 py-3 text-sm font-bold ${
                    jenis === "PEMASUKAN"
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  Pemasukan
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setJenis("PENGELUARAN")
                  }
                  className={`rounded-xl px-4 py-3 text-sm font-bold ${
                    jenis === "PENGELUARAN"
                      ? "bg-red-600 text-white"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  Pengeluaran
                </button>

              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Nama Kategori
              </label>

              <input
                type="text"
                value={nama}
                onChange={(e) =>
                  setNama(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    tambahKategori();
                  }
                }}
                placeholder={
                  jenis === "PEMASUKAN"
                    ? "Contoh: Donasi"
                    : "Contoh: Pemeliharaan"
                }
                className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm text-slate-800 outline-none focus:border-slate-500"
              />
            </div>

            <button
              type="button"
              onClick={tambahKategori}
              disabled={saving}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Menyimpan..."
                : "+ Tambah Kategori"}
            </button>

          </div>

        </section>

        <section className="mb-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">

          <div className="mb-4">
            <h2 className="font-bold text-slate-900">
              Kategori Pemasukan
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Digunakan untuk pemasukan Kas RW selain IPK otomatis.
            </p>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">
              Memuat kategori...
            </div>
          ) : (
            tampilkanKategori(pemasukan)
          )}

        </section>

        <section className="mb-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">

          <div className="mb-4">
            <h2 className="font-bold text-slate-900">
              Kategori Pengeluaran
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Digunakan untuk mencatat penggunaan Kas RW.
            </p>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">
              Memuat kategori...
            </div>
          ) : (
            tampilkanKategori(pengeluaran)
          )}

        </section>

        <section className="rounded-2xl bg-blue-50 p-5 text-sm text-blue-800 ring-1 ring-blue-100">

          <p className="font-bold">
            Catatan
          </p>

          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Kategori tidak dihapus agar transaksi lama tetap aman.
            </li>
            <li>
              Nonaktifkan kategori jika sudah tidak digunakan.
            </li>
            <li>
              Transaksi IPK tetap dikelola melalui menu IPK Warga.
            </li>
          </ul>

        </section>

      </div>
    </main>
  );
}