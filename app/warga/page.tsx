"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

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

type Kategori = {
  id: number;
  nama: string;
};

type WargaKategori = {
  warga_id: number;
  kategori_id: number;
};

type WargaDenganKategori = Warga & {
  kategori: Kategori[];
};

export default function WargaPage() {
  const [warga, setWarga] = useState<
    WargaDenganKategori[]
  >([]);

  const [kategori, setKategori] = useState<Kategori[]>(
    []
  );

  const [search, setSearch] = useState("");
  const [filterKategori, setFilterKategori] =
    useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [pesan, setPesan] = useState("");

  useEffect(() => {
    ambilData();
  }, []);

  async function ambilData() {
    setLoading(true);
    setPesan("");

    const { data: dataWarga, error: wargaError } =
      await supabase
        .from("warga")
        .select("*")
        .order("nama", { ascending: true });

    if (wargaError) {
      console.error(
        "Gagal mengambil data warga:",
        wargaError
      );

      setPesan(
        "Gagal mengambil data warga: " +
          wargaError.message
      );

      setLoading(false);
      return;
    }

    const { data: dataKategori, error: kategoriError } =
      await supabase
        .from("kategori_warga")
        .select("id, nama")
        .order("nama", { ascending: true });

    if (kategoriError) {
      console.error(
        "Gagal mengambil kategori:",
        kategoriError
      );

      setPesan(
        "Gagal mengambil kategori: " +
          kategoriError.message
      );

      setLoading(false);
      return;
    }

    const {
      data: dataRelasi,
      error: relasiError,
    } = await supabase
      .from("warga_kategori")
      .select("warga_id, kategori_id");

    if (relasiError) {
      console.error(
        "Gagal mengambil relasi kategori:",
        relasiError
      );

      setPesan(
        "Gagal mengambil kategori warga: " +
          relasiError.message
      );

      setLoading(false);
      return;
    }

    const daftarKategori = dataKategori || [];
    const daftarRelasi = dataRelasi || [];

    const hasil: WargaDenganKategori[] = (
      dataWarga || []
    ).map((item) => {
      const kategoriWarga = daftarRelasi
        .filter(
          (relasi) =>
            relasi.warga_id === item.id
        )
        .map((relasi) =>
          daftarKategori.find(
            (kategoriItem) =>
              kategoriItem.id ===
              relasi.kategori_id
          )
        )
        .filter(
          (item): item is Kategori =>
            item !== undefined
        );

      return {
        ...item,
        kategori: kategoriWarga,
      };
    });

    setWarga(hasil);
    setKategori(daftarKategori);
    setLoading(false);
  }

  function hitungUmur(
    tanggalLahir: string | null
  ): number | null {
    if (!tanggalLahir) {
      return null;
    }

    const lahir = new Date(tanggalLahir);
    const sekarang = new Date();

    let umur =
      sekarang.getFullYear() -
      lahir.getFullYear();

    const bulan =
      sekarang.getMonth() -
      lahir.getMonth();

    if (
      bulan < 0 ||
      (bulan === 0 &&
        sekarang.getDate() < lahir.getDate())
    ) {
      umur--;
    }

    return umur;
  }

  function formatJenisKelamin(
    jenisKelamin: string | null
  ) {
    if (jenisKelamin === "L") {
      return "Laki-laki";
    }

    if (jenisKelamin === "P") {
      return "Perempuan";
    }

    return "-";
  }

  const wargaTersaring = warga.filter((item) => {
    const teksSearch = search
      .toLowerCase()
      .trim();

    const cocokSearch =
      !teksSearch ||
      item.nama
        .toLowerCase()
        .includes(teksSearch) ||
      item.nik.includes(teksSearch);

    const cocokKategori =
      filterKategori === null ||
      item.kategori.some(
        (kategoriItem) =>
          kategoriItem.id === filterKategori
      );

    return cocokSearch && cocokKategori;
  });

  return (
    <main className="min-h-screen bg-gray-100 pb-10">
      <header className="bg-blue-700 px-5 py-6 text-white">
        <div className="mx-auto max-w-xl">
          <p className="text-sm text-blue-100">
            Nuansa Indah Ciomas
          </p>

          <h1 className="mt-1 text-2xl font-bold">
            Data Warga
          </h1>

          <p className="mt-1 text-sm text-blue-100">
            RW 16 • RT 01–06
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-5">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-500">
                Total warga
              </p>

              <p className="text-2xl font-bold text-gray-800">
                {warga.length}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                (window.location.href =
                  "/warga/tambah")
              }
              className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              + Tambah Warga
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Cari Nama / NIK
          </label>

          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="🔎 Cari nama atau NIK..."
            className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
          />

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() =>
                setFilterKategori(null)
              }
              className={
                "whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition " +
                (filterKategori === null
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600")
              }
            >
              SEMUA
            </button>

            {kategori.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setFilterKategori(item.id)
                }
                className={
                  "whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition " +
                  (filterKategori === item.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600")
                }
              >
                {item.nama}
              </button>
            ))}
          </div>
        </div>

        {pesan && (
          <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600">
            {pesan}
          </div>
        )}

        {loading ? (
          <div className="mt-4 rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-gray-500">
              Memuat data warga...
            </p>
          </div>
        ) : wargaTersaring.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="font-semibold text-gray-700">
              Data warga tidak ditemukan.
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Coba ubah pencarian atau filter.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {wargaTersaring.map((item) => {
              const umur = hitungUmur(
                item.tanggal_lahir
              );

              return (
                <div
                  key={item.id}
                  className="rounded-2xl bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-gray-800">
                        {item.nama}
                      </h2>

                      <p className="mt-1 text-sm font-semibold text-blue-600">
                        RT {item.rt}
                      </p>
                    </div>

                    <span
                      className={
                        "rounded-full px-3 py-1 text-xs font-bold " +
                        (item.status_warga ===
                        "Aktif"
                          ? "bg-green-50 text-green-600"
                          : "bg-gray-100 text-gray-500")
                      }
                    >
                      {item.status_warga ||
                        "Aktif"}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-gray-600">
                    {formatJenisKelamin(
                      item.jenis_kelamin
                    )}

                    {umur !== null &&
                      ` • ${umur} tahun`}
                  </p>

                  <p className="mt-2 text-xs text-gray-400">
                    NIK: {item.nik}
                  </p>

                  {item.kategori.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.kategori.map(
                        (kategoriItem) => (
                          <span
                            key={kategoriItem.id}
                            className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                          >
                            🏷️ {kategoriItem.nama}
                          </span>
                        )
                      )}
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        (window.location.href =
                          `/warga/${item.id}`)
                      }
                      className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      Lihat Detail
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        (window.location.href =
                          `/warga/${item.id}/edit`)
                      }
                      className="rounded-xl bg-gray-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-900"
                    >
                      Edit Data
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}