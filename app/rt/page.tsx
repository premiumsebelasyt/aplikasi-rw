"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Warga = {
  id: number;
  no_kk: string | null;
  nama: string;
  rt: string;
  jenis_kelamin: string | null;
  status_warga: string | null;
};

type StatistikRT = {
  rt: string;
  total: number;
  laki: number;
  perempuan: number;
  kk: number;
  aktif: number;
};

const daftarRT = ["01", "02", "03", "04", "05", "06"];

export default function RTPage() {
  const [warga, setWarga] = useState<Warga[]>([]);
  const [loading, setLoading] = useState(true);
  const [pesan, setPesan] = useState("");

  useEffect(() => {
    ambilData();
  }, []);

  async function ambilData() {
    setLoading(true);
    setPesan("");

    const { data, error } = await supabase
      .from("warga")
      .select(
        "id, no_kk, nama, rt, jenis_kelamin, status_warga"
      )
      .order("nama", { ascending: true });

    if (error) {
      console.error("Gagal mengambil data RT:", error);

      setPesan(
        "Gagal mengambil data warga: " +
          error.message
      );

      setLoading(false);
      return;
    }

    setWarga(data || []);
    setLoading(false);
  }

  function normalisasiRT(rt: string | null) {
    if (!rt) return "";

    return String(rt).padStart(2, "0");
  }

  function statistikRT(rt: string): StatistikRT {
    const dataRT = warga.filter(
      (item) => normalisasiRT(item.rt) === rt
    );

    const laki = dataRT.filter(
      (item) => item.jenis_kelamin === "L"
    ).length;

    const perempuan = dataRT.filter(
      (item) => item.jenis_kelamin === "P"
    ).length;

    const daftarKK = new Set(
      dataRT
        .map((item) => item.no_kk)
        .filter(
          (noKK): noKK is string =>
            Boolean(noKK && noKK.trim())
        )
    );

    const aktif = dataRT.filter(
      (item) =>
        !item.status_warga ||
        item.status_warga === "Aktif"
    ).length;

    return {
      rt,
      total: dataRT.length,
      laki,
      perempuan,
      kk: daftarKK.size,
      aktif,
    };
  }

  const statistik = daftarRT.map(statistikRT);

  const totalWarga = statistik.reduce(
    (total, item) => total + item.total,
    0
  );

  const totalKK = statistik.reduce(
    (total, item) => total + item.kk,
    0
  );

  const totalLaki = statistik.reduce(
    (total, item) => total + item.laki,
    0
  );

  const totalPerempuan = statistik.reduce(
    (total, item) => total + item.perempuan,
    0
  );

  const totalAktif = statistik.reduce(
    (total, item) => total + item.aktif,
    0
  );

  function lihatWarga(rt: string) {
    window.location.href = `/warga?rt=${rt}`;
  }

  return (
    <main className="min-h-screen bg-gray-100 pb-10">
      <header className="bg-blue-700 px-5 py-6 text-white">
        <div className="mx-auto max-w-xl">
          <p className="text-sm text-blue-100">
            Nuansa Indah Ciomas
          </p>

          <h1 className="mt-1 text-2xl font-bold">
            Data RT
          </h1>

          <p className="mt-1 text-sm text-blue-100">
            RW 16 • RT 01–06
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-5">

        {/* RINGKASAN */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-600">
            Ringkasan RW 16
          </p>

          {loading ? (
            <p className="mt-4 text-sm text-gray-500">
              Memuat data...
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-blue-50 p-4">
                <p className="text-xs font-semibold text-blue-600">
                  Total Warga
                </p>

                <p className="mt-1 text-2xl font-bold text-blue-800">
                  {totalWarga}
                </p>
              </div>

              <div className="rounded-2xl bg-green-50 p-4">
                <p className="text-xs font-semibold text-green-600">
                  Total KK
                </p>

                <p className="mt-1 text-2xl font-bold text-green-800">
                  {totalKK}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-semibold text-gray-600">
                  Laki-laki
                </p>

                <p className="mt-1 text-2xl font-bold text-gray-800">
                  {totalLaki}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-semibold text-gray-600">
                  Perempuan
                </p>

                <p className="mt-1 text-2xl font-bold text-gray-800">
                  {totalPerempuan}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ERROR */}
        {pesan && (
          <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-600">
            {pesan}
          </div>
        )}

        {/* DAFTAR RT */}
        <div className="mt-4">
          <div className="mb-3 px-1">
            <h2 className="font-bold text-gray-800">
              Daftar RT
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Statistik otomatis berdasarkan data warga RW 16
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
              <p className="text-sm text-gray-500">
                Memuat data RT...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {statistik.map((item) => (
                <div
                  key={item.rt}
                  className="rounded-2xl bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-blue-600">
                        RW 16
                      </p>

                      <h3 className="mt-1 text-xl font-bold text-gray-800">
                        RT {item.rt}
                      </h3>
                    </div>

                    <div className="rounded-xl bg-blue-50 px-3 py-2 text-right">
                      <p className="text-xs text-blue-600">
                        Warga
                      </p>

                      <p className="text-xl font-bold text-blue-700">
                        {item.total}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">
                        KK
                      </p>

                      <p className="mt-1 font-bold text-gray-800">
                        {item.kk}
                      </p>
                    </div>

                    <div className="rounded-xl bg-green-50 p-3">
                      <p className="text-xs text-green-600">
                        Aktif
                      </p>

                      <p className="mt-1 font-bold text-green-700">
                        {item.aktif}
                      </p>
                    </div>

                    <div className="rounded-xl bg-blue-50 p-3">
                      <p className="text-xs text-blue-600">
                        Laki-laki
                      </p>

                      <p className="mt-1 font-bold text-blue-700">
                        {item.laki}
                      </p>
                    </div>

                    <div className="rounded-xl bg-pink-50 p-3">
                      <p className="text-xs text-pink-600">
                        Perempuan
                      </p>

                      <p className="mt-1 font-bold text-pink-700">
                        {item.perempuan}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => lihatWarga(item.rt)}
                    className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                  >
                    Lihat Warga RT {item.rt}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* TOTAL AKTIF */}
        {!loading && (
          <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Total warga aktif
            </p>

            <p className="mt-1 text-3xl font-bold text-green-600">
              {totalAktif}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Data dihitung langsung dari tabel warga.
            </p>
          </div>
        )}

        {/* KEMBALI */}
        <button
          type="button"
          onClick={() =>
            (window.location.href = "/")
          }
          className="mt-5 w-full rounded-xl bg-gray-800 px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-900"
        >
          ← Kembali ke Dashboard
        </button>
      </div>
    </main>
  );
}