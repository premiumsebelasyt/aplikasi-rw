export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 pb-24">

      {/* HEADER */}
      <header className="bg-blue-700 px-5 pb-8 pt-8 text-white">
        <p className="text-sm text-blue-100">
          Nuansa Indah Ciomas
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          RW 16
        </h1>

        <p className="mt-1 text-sm text-blue-100">
          Pelayanan Surat Digital
        </p>
      </header>

      {/* CONTENT */}
      <div className="mx-auto -mt-4 max-w-md px-4">

        {/* USER CARD */}
        <div className="rounded-2xl bg-white p-5 shadow-md">
          <p className="text-sm text-gray-500">
            Selamat datang 👋
          </p>

          <h2 className="mt-1 text-xl font-bold text-gray-800">
            Ketua RT / RW
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Silakan pilih layanan administrasi
          </p>
        </div>

        {/* BUAT SURAT */}
        <a
          href="/buat-surat"
          className="mt-5 block w-full rounded-2xl bg-blue-700 p-5 text-left text-white shadow-lg transition active:scale-95"
        >
          <div className="flex items-center justify-between">

            <div>
              <p className="text-2xl font-bold">
                Buat Surat
              </p>

              <p className="mt-1 text-sm text-blue-100">
                Buat surat pengantar warga
              </p>
            </div>

            <div className="text-4xl">
              +
            </div>

          </div>
        </a>

        {/* MENU */}
        <div className="mt-5 grid grid-cols-2 gap-4">

          {/* ARSIP */}
          <button className="rounded-2xl bg-white p-5 text-left shadow-sm transition active:scale-95">
            <div className="text-3xl">
              📄
            </div>

            <h3 className="mt-3 font-bold text-gray-800">
              Arsip Surat
            </h3>

            <p className="mt-1 text-xs text-gray-500">
              Surat yang sudah dibuat
            </p>
          </button>

          {/* WARGA */}
          <button className="rounded-2xl bg-white p-5 text-left shadow-sm transition active:scale-95">
            <div className="text-3xl">
              👥
            </div>

            <h3 className="mt-3 font-bold text-gray-800">
              Data Warga
            </h3>

            <p className="mt-1 text-xs text-gray-500">
              Data warga RT
            </p>
          </button>

          {/* RT */}
          <button className="rounded-2xl bg-white p-5 text-left shadow-sm transition active:scale-95">
            <div className="text-3xl">
              🏠
            </div>

            <h3 className="mt-3 font-bold text-gray-800">
              Data RT
            </h3>

            <p className="mt-1 text-xs text-gray-500">
              Pengurus RT
            </p>
          </button>

          {/* PENGATURAN */}
          <button className="rounded-2xl bg-white p-5 text-left shadow-sm transition active:scale-95">
            <div className="text-3xl">
              ⚙️
            </div>

            <h3 className="mt-3 font-bold text-gray-800">
              Pengaturan
            </h3>

            <p className="mt-1 text-xs text-gray-500">
              Pengaturan sistem
            </p>
          </button>

        </div>

        {/* SURAT TERBARU */}
        <section className="mt-7">

          <h2 className="mb-3 text-lg font-bold text-gray-800">
            Surat Terbaru
          </h2>

          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>
                <p className="font-semibold text-gray-700">
                  Belum ada surat
                </p>

                <p className="mt-1 text-sm text-gray-400">
                  Surat yang dibuat akan muncul di sini
                </p>
              </div>

              <div className="text-3xl">
                📄
              </div>

            </div>

          </div>

        </section>

      </div>

      {/* BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-white shadow-lg">

        <div className="mx-auto flex max-w-md justify-around py-3">

          <button className="text-center text-blue-700">
            <div className="text-xl">
              🏠
            </div>

            <div className="mt-1 text-xs font-semibold">
              Beranda
            </div>
          </button>

          <button className="text-center text-gray-500">
            <div className="text-xl">
              📄
            </div>

            <div className="mt-1 text-xs">
              Surat
            </div>
          </button>

          <button className="text-center text-gray-500">
            <div className="text-xl">
              👥
            </div>

            <div className="mt-1 text-xs">
              Warga
            </div>
          </button>

          <button className="text-center text-gray-500">
            <div className="text-xl">
              ⚙️
            </div>

            <div className="mt-1 text-xs">
              Pengaturan
            </div>
          </button>

        </div>

      </nav>

    </main>
  );
}