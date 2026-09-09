"use client";

import Link from "next/link";

export default function PengaturanPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <div className="mx-auto max-w-3xl px-4 py-5">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/"
            className="mb-3 inline-flex items-center text-sm font-medium text-slate-500"
          >
            ← Kembali ke Dashboard
          </Link>

          <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              SISTEM ADMINISTRASI
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              Pengaturan
            </h1>

            <p className="mt-1 text-sm text-slate-300">
              Pengaturan umum aplikasi RW 16 Nuansa Indah Ciomas.
            </p>
          </div>
        </div>

        {/* Wilayah */}
        <section className="mb-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Wilayah
          </p>

          <h2 className="mt-1 text-lg font-bold text-slate-900">
            Nuansa Indah Ciomas
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">RW</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                16
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Jumlah RT</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                6
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            RT yang terdaftar: RT 01, RT 02, RT 03, RT 04, RT 05, dan RT 06.
          </p>
        </section>

        {/* Menu */}
        <section className="space-y-3">
          <Link
            href="/warga"
            className="block rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition active:scale-[0.99]"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              DATA WARGA
            </p>

            <h2 className="mt-1 font-bold text-slate-900">
              Data Warga
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Kelola dan lihat data warga RW 16.
            </p>
          </Link>

          <Link
            href="/rt"
            className="block rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition active:scale-[0.99]"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              DATA RT
            </p>

            <h2 className="mt-1 font-bold text-slate-900">
              Data RT
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Rekap warga berdasarkan RT 01 sampai RT 06.
            </p>
          </Link>

          <Link
            href="/surat"
            className="block rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition active:scale-[0.99]"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              ADMINISTRASI
            </p>

            <h2 className="mt-1 font-bold text-slate-900">
              Arsip Surat
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Lihat dan kelola arsip surat warga.
            </p>
          </Link>

          <Link
            href="/kas/pengaturan"
            className="block rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition active:scale-[0.99]"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              KEUANGAN RW
            </p>

            <h2 className="mt-1 font-bold text-slate-900">
              Pengaturan Kas RW
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Kelola kategori pemasukan dan pengeluaran Kas RW 16.
            </p>
          </Link>
        </section>

        {/* Info */}
        <div className="mt-6 rounded-2xl bg-slate-100 p-4 text-center">
          <p className="text-xs text-slate-500">
            Nuansa Indah Ciomas · RW 16
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Sistem Administrasi Digital
          </p>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-4">
          <Link
            href="/"
            className="flex flex-col items-center gap-1 py-3 text-xs text-slate-500"
          >
            <span className="text-lg">⌂</span>
            <span>Beranda</span>
          </Link>

          <Link
            href="/surat"
            className="flex flex-col items-center gap-1 py-3 text-xs text-slate-500"
          >
            <span className="text-lg">▤</span>
            <span>Surat</span>
          </Link>

          <Link
            href="/warga"
            className="flex flex-col items-center gap-1 py-3 text-xs text-slate-500"
          >
            <span className="text-lg">♙</span>
            <span>Warga</span>
          </Link>

          <Link
            href="/pengaturan"
            className="flex flex-col items-center gap-1 py-3 text-xs font-semibold text-slate-900"
          >
            <span className="text-lg">⚙</span>
            <span>Pengaturan</span>
          </Link>
        </div>
      </nav>
    </main>
  );
}