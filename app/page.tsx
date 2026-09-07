"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 pb-24">
      <header className="bg-blue-700 px-5 py-6 text-white">
        <div className="mx-auto max-w-xl">
          <p className="text-sm text-blue-100">
            Nuansa Indah Ciomas
          </p>

          <h1 className="mt-1 text-2xl font-bold">
            RW 16
          </h1>

          <p className="mt-1 text-sm text-blue-100">
            Pelayanan Administrasi Digital
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-5">
        {/* User */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Pengguna
          </p>

          <h2 className="mt-1 text-lg font-bold text-gray-800">
            Ketua RT / RW
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Sistem Administrasi RW 16
          </p>
        </div>

        {/* Buat Surat */}
        <Link
          href="/buat-surat"
          className="mt-4 block rounded-2xl bg-blue-600 p-5 text-white shadow-sm transition hover:bg-blue-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-100">
                Pelayanan
              </p>

              <h2 className="mt-1 text-xl font-bold">
                Buat Surat
              </h2>

              <p className="mt-1 text-sm text-blue-100">
                Buat surat administrasi warga
              </p>
            </div>

            <span className="text-3xl">
              📝
            </span>
          </div>
        </Link>

        {/* Menu */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Link
            href="/surat"
            className="rounded-2xl bg-white p-5 shadow-sm transition hover:bg-gray-50"
          >
            <div className="text-3xl">
              📂
            </div>

            <h2 className="mt-3 font-bold text-gray-800">
              Arsip Surat
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Lihat surat yang tersimpan
            </p>
          </Link>

          <Link
            href="/warga"
            className="rounded-2xl bg-white p-5 shadow-sm transition hover:bg-gray-50"
          >
            <div className="text-3xl">
              👥
            </div>

            <h2 className="mt-3 font-bold text-gray-800">
              Data Warga
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Kelola data warga RW 16
            </p>
          </Link>

          <Link
            href="/rt"
            className="rounded-2xl bg-white p-5 shadow-sm transition hover:bg-gray-50"
          >
            <div className="text-3xl">
              🏘️
            </div>

            <h2 className="mt-3 font-bold text-gray-800">
              Data RT
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              RT 01 sampai RT 06
            </p>
          </Link>

          <Link
            href="/pengaturan"
            className="rounded-2xl bg-white p-5 shadow-sm transition hover:bg-gray-50"
          >
            <div className="text-3xl">
              ⚙️
            </div>

            <h2 className="mt-3 font-bold text-gray-800">
              Pengaturan
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Pengaturan aplikasi
            </p>
          </Link>
        </div>

        {/* Surat Masuk RW */}
        <Link
          href="/rw/surat"
          className="mt-4 block rounded-2xl bg-white p-5 shadow-sm ring-2 ring-blue-100 transition hover:bg-blue-50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-600">
                KHUSUS RW / ADMIN
              </p>

              <h2 className="mt-1 text-xl font-bold text-gray-800">
                Surat Masuk RW
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Review surat yang diajukan RT
              </p>
            </div>

            <span className="text-3xl">
              📥
            </span>
          </div>
        </Link>

        {/* Wilayah */}
        <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Wilayah
              </p>

              <h2 className="mt-1 text-lg font-bold text-gray-800">
                Nuansa Indah Ciomas
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                RW 16 • RT 01–06
              </p>
            </div>

            <span className="text-3xl">
              🏠
            </span>
          </div>
        </div>

        {/* Surat Terbaru */}
        <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-800">
              Surat Terbaru
            </h2>

            <Link
              href="/surat"
              className="text-sm font-semibold text-blue-600"
            >
              Lihat Semua
            </Link>
          </div>

          <p className="mt-4 text-sm text-gray-500">
            Belum ada daftar surat yang ditampilkan.
          </p>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white">
        <div className="mx-auto grid max-w-xl grid-cols-4">
          <Link
            href="/"
            className="flex flex-col items-center px-2 py-3 text-xs font-semibold text-blue-600"
          >
            <span className="text-xl">
              🏠
            </span>

            <span className="mt-1">
              Beranda
            </span>
          </Link>

          <Link
            href="/surat"
            className="flex flex-col items-center px-2 py-3 text-xs font-semibold text-gray-500"
          >
            <span className="text-xl">
              📝
            </span>

            <span className="mt-1">
              Surat
            </span>
          </Link>

          <Link
            href="/warga"
            className="flex flex-col items-center px-2 py-3 text-xs font-semibold text-gray-500"
          >
            <span className="text-xl">
              👥
            </span>

            <span className="mt-1">
              Warga
            </span>
          </Link>

          <Link
            href="/pengaturan"
            className="flex flex-col items-center px-2 py-3 text-xs font-semibold text-gray-500"
          >
            <span className="text-xl">
              ⚙️
            </span>

            <span className="mt-1">
              Pengaturan
            </span>
          </Link>
        </div>
      </nav>
    </main>
  );
}