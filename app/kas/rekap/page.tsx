"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type Transaksi = {
  tanggal: string;
  jenis: "PEMASUKAN" | "PENGELUARAN";
  nominal: number;
};

type SaldoAwal = {
  bulan: string;
  nominal: number;
};

type Ipk = {
  bulan: string;
  terkumpul: number;
};

type RekapBulan = {
  bulan: string;
  namaBulan: string;
  saldoAwal: number | null;
  pemasukan: number;
  pengeluaran: number;
  saldoAkhir: number | null;
  ipk: number;
};

const NAMA_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function RekapKasPage() {
  const [tahun, setTahun] = useState(
    String(new Date().getFullYear())
  );

  const [transaksi, setTransaksi] = useState<
    Transaksi[]
  >([]);

  const [saldoAwalData, setSaldoAwalData] = useState<
    SaldoAwal[]
  >([]);

  const [ipk, setIpk] = useState<Ipk[]>([]);

  const [loading, setLoading] = useState(true);

  const tahunSekarang = new Date().getFullYear();

  const daftarTahun = Array.from(
    { length: 5 },
    (_, index) => tahunSekarang - index
  );

  async function loadData() {
    setLoading(true);

    const awalTahun = `${tahun}-01-01`;
    const akhirTahun = `${tahun}-12-31`;

    const [
      transaksiRes,
      saldoAwalRes,
      ipkRes,
    ] = await Promise.all([
      supabase
        .from("kas_transaksi")
        .select(
          "tanggal, jenis, nominal"
        )
        .gte("tanggal", awalTahun)
        .lte("tanggal", akhirTahun)
        .order("tanggal", {
          ascending: true,
        }),

      supabase
        .from("kas_saldo_awal")
        .select(
          "bulan, nominal"
        )
        .gte("bulan", awalTahun)
        .lte("bulan", akhirTahun)
        .order("bulan", {
          ascending: true,
        }),

      supabase
        .from("kas_ipk")
        .select(
          "bulan, terkumpul"
        )
        .gte("bulan", awalTahun)
        .lte("bulan", akhirTahun)
        .order("bulan", {
          ascending: true,
        }),
    ]);

    if (transaksiRes.error) {
      console.error(transaksiRes.error);

      alert(
        `Gagal mengambil transaksi Kas: ${transaksiRes.error.message}`
      );

      setLoading(false);
      return;
    }

    if (saldoAwalRes.error) {
      console.error(saldoAwalRes.error);

      alert(
        `Gagal mengambil saldo awal: ${saldoAwalRes.error.message}`
      );

      setLoading(false);
      return;
    }

    if (ipkRes.error) {
      console.error(ipkRes.error);

      alert(
        `Gagal mengambil data IPK: ${ipkRes.error.message}`
      );

      setLoading(false);
      return;
    }

    setTransaksi(
      (transaksiRes.data || []).map(
        (item) => ({
          ...item,
          nominal: Number(
            item.nominal || 0
          ),
        })
      )
    );

    setSaldoAwalData(
      (saldoAwalRes.data || []).map(
        (item) => ({
          ...item,
          nominal: Number(
            item.nominal || 0
          ),
        })
      )
    );

    setIpk(
      (ipkRes.data || []).map(
        (item) => ({
          ...item,
          terkumpul: Number(
            item.terkumpul || 0
          ),
        })
      )
    );

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [tahun]);

  const rekap = useMemo<RekapBulan[]>(() => {
    return NAMA_BULAN.map(
      (namaBulan, index) => {
        const nomorBulan = String(
          index + 1
        ).padStart(2, "0");

        const bulan = `${tahun}-${nomorBulan}`;

        const transaksiBulan =
          transaksi.filter(
            (item) =>
              item.tanggal.startsWith(
                bulan
              )
          );

        const pemasukan =
          transaksiBulan
            .filter(
              (item) =>
                item.jenis ===
                "PEMASUKAN"
            )
            .reduce(
              (total, item) =>
                total + item.nominal,
              0
            );

        const pengeluaran =
          transaksiBulan
            .filter(
              (item) =>
                item.jenis ===
                "PENGELUARAN"
            )
            .reduce(
              (total, item) =>
                total + item.nominal,
              0
            );

        const saldoManual =
          saldoAwalData.find(
            (item) =>
              item.bulan.startsWith(
                bulan
              )
          );

        const adaSaldoAwal =
          !!saldoManual;

        const adaTransaksi =
          pemasukan > 0 ||
          pengeluaran > 0;

        const saldoAwal =
          adaSaldoAwal
            ? saldoManual!.nominal
            : null;

        const saldoAkhir =
          adaSaldoAwal ||
          adaTransaksi
            ? Number(saldoAwal || 0) +
              pemasukan -
              pengeluaran
            : null;

        const ipkBulan =
          ipk
            .filter(
              (item) =>
                item.bulan.startsWith(
                  bulan
                )
            )
            .reduce(
              (total, item) =>
                total + item.terkumpul,
              0
            );

        return {
          bulan,
          namaBulan,
          saldoAwal,
          pemasukan,
          pengeluaran,
          saldoAkhir,
          ipk: ipkBulan,
        };
      }
    );
  }, [
    tahun,
    transaksi,
    saldoAwalData,
    ipk,
  ]);

  const totalPemasukan =
    rekap.reduce(
      (total, item) =>
        total + item.pemasukan,
      0
    );

  const totalPengeluaran =
    rekap.reduce(
      (total, item) =>
        total + item.pengeluaran,
      0
    );

  const totalIpk =
    rekap.reduce(
      (total, item) =>
        total + item.ipk,
      0
    );

  const saldoAwalTahun =
    rekap[0]?.saldoAwal ?? null;

  const bulanTerakhirBerisiSaldo =
    [...rekap]
      .reverse()
      .find(
        (item) =>
          item.saldoAkhir !== null
      );

  const saldoAkhirTahun =
    bulanTerakhirBerisiSaldo?.saldoAkhir ??
    null;

  return (
    <main className="min-h-screen bg-slate-100 pb-24">
      <div className="mx-auto max-w-6xl px-4 py-5">

        {/* HEADER */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-600">
              Kas RW 16
            </p>

            <h1 className="text-2xl font-bold text-slate-950">
              Rekap Bulanan
            </h1>

            <p className="mt-1 text-sm font-medium text-slate-600">
              Ringkasan perkembangan Kas RW selama satu tahun.
            </p>
          </div>

          <Link
            href="/kas"
            className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-sm ring-1 ring-slate-300"
          >
            ← Kas
          </Link>
        </div>

        {/* FILTER TAHUN */}
        <section className="mb-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-300">

          <label className="mb-2 block text-sm font-bold text-slate-800">
            Tahun
          </label>

          <select
            value={tahun}
            onChange={(e) =>
              setTahun(e.target.value)
            }
            className="h-12 w-full rounded-xl border border-slate-400 bg-white px-4 font-medium text-slate-900 outline-none focus:border-slate-700 sm:max-w-xs"
          >
            {daftarTahun.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              )
            )}
          </select>

        </section>

        {/* RINGKASAN */}
        <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-300">
            <p className="text-sm font-semibold text-slate-600">
              Saldo Awal Tahun
            </p>

            <p className="mt-2 text-xl font-bold text-slate-950">
              {saldoAwalTahun === null
                ? "—"
                : formatRupiah(
                    saldoAwalTahun
                  )}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-300">
            <p className="text-sm font-semibold text-slate-600">
              Total Pemasukan
            </p>

            <p className="mt-2 text-xl font-bold text-emerald-700">
              {formatRupiah(
                totalPemasukan
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-300">
            <p className="text-sm font-semibold text-slate-600">
              Total Pengeluaran
            </p>

            <p className="mt-2 text-xl font-bold text-red-700">
              {formatRupiah(
                totalPengeluaran
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-lg">
            <p className="text-sm font-semibold text-slate-300">
              Saldo Akhir Tahun
            </p>

            <p
              className={`mt-2 text-xl font-bold ${
                saldoAkhirTahun === null
                  ? "text-slate-300"
                  : saldoAkhirTahun >= 0
                    ? "text-emerald-300"
                    : "text-red-300"
              }`}
            >
              {saldoAkhirTahun === null
                ? "—"
                : formatRupiah(
                    saldoAkhirTahun
                  )}
            </p>
          </div>

        </section>

        {/* INFO RUMUS */}
        <section className="mb-5 rounded-2xl bg-blue-50 p-4 text-sm text-blue-900 ring-1 ring-blue-200">

          <p className="font-bold">
            Rumus Saldo
          </p>

          <p className="mt-1 font-medium">
            Saldo Awal + Pemasukan − Pengeluaran
            = Saldo Akhir
          </p>

          <p className="mt-2 font-medium">
            Setiap bulan dihitung secara terpisah.
            Saldo akhir bulan sebelumnya tidak otomatis
            menjadi saldo awal bulan berikutnya.
          </p>

          <p className="mt-2 font-semibold">
            IPK terkumpul tahun{" "}
            {tahun}:{" "}
            {formatRupiah(totalIpk)}
          </p>

        </section>

        {/* REKAP BULANAN */}
        <section className="mb-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-300">

          <div className="mb-5">
            <h2 className="font-bold text-slate-950">
              Rekap {tahun}
            </h2>

            <p className="mt-1 text-sm font-medium text-slate-600">
              Ringkasan Kas dari Januari sampai Desember.
            </p>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm font-semibold text-slate-600">
              Memuat rekap...
            </div>
          ) : (
            <>

              {/* MOBILE */}
              <div className="space-y-3 md:hidden">

                {rekap.map(
                  (item) => {

                    const belumAdaSaldo =
                      item.saldoAwal === null &&
                      item.saldoAkhir === null &&
                      item.pemasukan === 0 &&
                      item.pengeluaran === 0;

                    return (
                      <div
                        key={item.bulan}
                        className="rounded-2xl border border-slate-300 bg-white p-4"
                      >

                        <div className="mb-4 flex items-center justify-between gap-3">

                          <h3 className="font-bold text-slate-950">
                            {item.namaBulan}
                          </h3>

                          {belumAdaSaldo ? (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                              Belum ada data
                            </span>
                          ) : item.saldoAkhir !== null &&
                            item.saldoAkhir >= 0 ? (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                              Saldo +
                            </span>
                          ) : (
                            <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-800">
                              Saldo −
                            </span>
                          )}

                        </div>

                        <div className="grid grid-cols-2 gap-4">

                          <div>
                            <p className="text-xs font-semibold text-slate-600">
                              Saldo Awal
                            </p>

                            <p className="mt-1 text-sm font-bold text-slate-950">
                              {item.saldoAwal === null
                                ? "—"
                                : formatRupiah(
                                    item.saldoAwal
                                  )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-slate-600">
                              Saldo Akhir
                            </p>

                            <p
                              className={`mt-1 text-sm font-bold ${
                                item.saldoAkhir === null
                                  ? "text-slate-500"
                                  : item.saldoAkhir >= 0
                                    ? "text-emerald-700"
                                    : "text-red-700"
                              }`}
                            >
                              {item.saldoAkhir === null
                                ? "—"
                                : formatRupiah(
                                    item.saldoAkhir
                                  )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-slate-600">
                              Pemasukan
                            </p>

                            <p className="mt-1 text-sm font-bold text-emerald-700">
                              {item.pemasukan === 0
                                ? "—"
                                : formatRupiah(
                                    item.pemasukan
                                  )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-slate-600">
                              Pengeluaran
                            </p>

                            <p className="mt-1 text-sm font-bold text-red-700">
                              {item.pengeluaran === 0
                                ? "—"
                                : formatRupiah(
                                    item.pengeluaran
                                  )}
                            </p>
                          </div>

                          <div className="col-span-2 border-t border-slate-300 pt-3">

                            <p className="text-xs font-semibold text-slate-600">
                              IPK Terkumpul
                            </p>

                            <p className="mt-1 text-sm font-bold text-blue-700">
                              {item.ipk === 0
                                ? "—"
                                : formatRupiah(
                                    item.ipk
                                  )}
                            </p>

                          </div>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>

              {/* DESKTOP */}
              <div className="hidden overflow-x-auto md:block">

                <table className="w-full min-w-[850px] border-collapse text-sm text-slate-950">

                  <thead>
                    <tr className="border-b-2 border-slate-300 bg-slate-100 text-left">

                      <th className="px-3 py-3 font-bold text-slate-950">
                        Bulan
                      </th>

                      <th className="px-3 py-3 text-right font-bold text-slate-950">
                        Saldo Awal
                      </th>

                      <th className="px-3 py-3 text-right font-bold text-emerald-800">
                        Pemasukan
                      </th>

                      <th className="px-3 py-3 text-right font-bold text-red-800">
                        Pengeluaran
                      </th>

                      <th className="px-3 py-3 text-right font-bold text-blue-800">
                        IPK
                      </th>

                      <th className="px-3 py-3 text-right font-bold text-slate-950">
                        Saldo Akhir
                      </th>

                    </tr>
                  </thead>

                  <tbody>

                    {rekap.map(
                      (item) => (
                        <tr
                          key={item.bulan}
                          className="border-b border-slate-300"
                        >

                          <td className="px-3 py-4 font-bold text-slate-950">
                            {item.namaBulan}
                          </td>

                          <td className="px-3 py-4 text-right font-semibold text-slate-950">
                            {item.saldoAwal === null
                              ? "—"
                              : formatRupiah(
                                  item.saldoAwal
                                )}
                          </td>

                          <td className="px-3 py-4 text-right font-bold text-emerald-700">
                            {item.pemasukan === 0
                              ? "—"
                              : formatRupiah(
                                  item.pemasukan
                                )}
                          </td>

                          <td className="px-3 py-4 text-right font-bold text-red-700">
                            {item.pengeluaran === 0
                              ? "—"
                              : formatRupiah(
                                  item.pengeluaran
                                )}
                          </td>

                          <td className="px-3 py-4 text-right font-bold text-blue-700">
                            {item.ipk === 0
                              ? "—"
                              : formatRupiah(
                                  item.ipk
                                )}
                          </td>

                          <td
                            className={`px-3 py-4 text-right font-bold ${
                              item.saldoAkhir === null
                                ? "text-slate-500"
                                : item.saldoAkhir >= 0
                                  ? "text-emerald-700"
                                  : "text-red-700"
                            }`}
                          >
                            {item.saldoAkhir === null
                              ? "—"
                              : formatRupiah(
                                  item.saldoAkhir
                                )}
                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                  <tfoot>

                    <tr className="border-t-2 border-slate-950 bg-slate-100">

                      <td className="px-3 py-4 font-bold text-slate-950">
                        TOTAL
                      </td>

                      <td className="px-3 py-4 text-right font-bold text-slate-950">
                        {saldoAwalTahun === null
                          ? "—"
                          : formatRupiah(
                              saldoAwalTahun
                            )}
                      </td>

                      <td className="px-3 py-4 text-right font-bold text-emerald-700">
                        {formatRupiah(
                          totalPemasukan
                        )}
                      </td>

                      <td className="px-3 py-4 text-right font-bold text-red-700">
                        {formatRupiah(
                          totalPengeluaran
                        )}
                      </td>

                      <td className="px-3 py-4 text-right font-bold text-blue-700">
                        {formatRupiah(
                          totalIpk
                        )}
                      </td>

                      <td
                        className={`px-3 py-4 text-right font-bold ${
                          saldoAkhirTahun === null
                            ? "text-slate-500"
                            : saldoAkhirTahun >= 0
                              ? "text-emerald-700"
                              : "text-red-700"
                        }`}
                      >
                        {saldoAkhirTahun === null
                          ? "—"
                          : formatRupiah(
                              saldoAkhirTahun
                            )}
                      </td>

                    </tr>

                  </tfoot>

                </table>

              </div>

            </>
          )}

        </section>

        {/* NAVIGASI */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

          <Link
            href="/kas"
            className="rounded-xl bg-white px-4 py-3 text-center text-sm font-bold text-slate-800 shadow-sm ring-1 ring-slate-300"
          >
            ← Dashboard
          </Link>

          <Link
            href="/kas/transaksi"
            className="rounded-xl bg-white px-4 py-3 text-center text-sm font-bold text-slate-800 shadow-sm ring-1 ring-slate-300"
          >
            Transaksi
          </Link>

          <Link
            href="/kas/laporan"
            className="rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-bold text-white"
          >
            Laporan
          </Link>

          <Link
            href="/kas/pengaturan"
            className="rounded-xl bg-white px-4 py-3 text-center text-sm font-bold text-slate-800 shadow-sm ring-1 ring-slate-300"
          >
            Pengaturan
          </Link>

        </div>

      </div>
    </main>
  );
}