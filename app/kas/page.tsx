"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { getDefaultReportPeriod, getReportPeriodRange, type ReportPeriodSelection } from "@/lib/report-period.mjs";
import { parseKasNominal } from "@/lib/kas/nominal.mjs";
import { calculateCashBalance } from "@/lib/kas/balance.mjs";
import { summarizeKasCashflow } from "@/lib/kas/cashflow-summary.mjs";
import { PageHeader } from "@/components/ui/AppShell";
import { PeriodFilter } from "@/components/ui/PeriodFilter";
import { requireMutationRow } from "@/lib/db/require-mutation-row.mjs";
import { useKasAuthority } from "@/lib/kas/use-kas-authority";

type Transaksi = {
  id: number;
  tanggal: string;
  jenis: "PEMASUKAN" | "PENGELUARAN";
  kategori_id: number | null;
  keterangan: string;
  nominal: number;
  rt: string | null;
  sumber: string | null;
  penerima: string | null;
};

type Kategori = {
  id: number;
  nama: string;
  jenis: "PEMASUKAN" | "PENGELUARAN";
};

type Ipk = {
  id: number;
  bulan: string;
  rt: string;
  terkumpul: number;
};

type SaldoAwal = {
  id: number;
  bulan: string;
  nominal: number;
  keterangan: string | null;
};

const RT_LIST = ["01", "02", "03", "04", "05", "06"];

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTanggal(value: string) {
  return new Date(value + "T00:00:00").toLocaleDateString(
    "id-ID",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

export default function KasPage() {
  const { canManage } = useKasAuthority();
  const [period, setPeriod] = useState<ReportPeriodSelection>(getDefaultReportPeriod);
  const periodRange = useMemo(() => getReportPeriodRange(period), [period]);

  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [ipk, setIpk] = useState<Ipk[]>([]);
  const [saldoAwalData, setSaldoAwalData] =
    useState<SaldoAwal | null>(null);

  const [saldoAwalInput, setSaldoAwalInput] =
    useState("");

  const [keteranganSaldo, setKeteranganSaldo] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [savingSaldo, setSavingSaldo] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);

    const [
      transaksiRes,
      kategoriRes,
      ipkRes,
      saldoAwalRes,
    ] = await Promise.all([
      supabase
        .from("kas_transaksi")
        .select(
          "id, tanggal, jenis, kategori_id, keterangan, nominal, rt, sumber, penerima"
        )
        .gte("tanggal", periodRange.start)
        .lte("tanggal", periodRange.end)
        .order("tanggal", { ascending: false })
        .order("id", { ascending: false }),

      supabase
        .from("kas_kategori")
        .select("id, nama, jenis")
        .eq("aktif", true)
        .order("nama"),

      supabase
        .from("kas_ipk")
        .select("id, bulan, rt, terkumpul")
        .gte("bulan", periodRange.start)
        .lte("bulan", periodRange.end)
        .order("rt"),

      supabase
        .from("kas_saldo_awal")
        .select("id, bulan, nominal, keterangan")
        .eq("bulan", periodRange.start)
        .maybeSingle(),
    ]);

    if (transaksiRes.error) {
      console.error(transaksiRes.error);
      alert("Gagal mengambil transaksi Kas.");
      setLoading(false);
      return;
    }

    if (kategoriRes.error) {
      console.error(kategoriRes.error);
      alert("Gagal mengambil kategori Kas.");
      setLoading(false);
      return;
    }

    if (ipkRes.error) {
      console.error(ipkRes.error);
      alert("Gagal mengambil data IPK.");
      setLoading(false);
      return;
    }

    if (saldoAwalRes.error) {
      console.error(saldoAwalRes.error);
      alert("Gagal mengambil saldo awal.");
      setLoading(false);
      return;
    }

    const transaksiData = (transaksiRes.data || []).map(
      (item) => ({
        ...item,
        nominal: Number(item.nominal || 0),
      })
    );

    const ipkData = (ipkRes.data || []).map((item) => ({
      ...item,
      terkumpul: Number(item.terkumpul || 0),
    }));

    setTransaksi(transaksiData);
    setKategori(kategoriRes.data || []);
    setIpk(ipkData);

    const saldoData = saldoAwalRes.data
      ? {
          ...saldoAwalRes.data,
          nominal: Number(
            saldoAwalRes.data.nominal || 0
          ),
        }
      : null;

    setSaldoAwalData(saldoData);

    setSaldoAwalInput(saldoData ? String(saldoData.nominal) : "");

    setKeteranganSaldo(
      saldoData?.keterangan || ""
    );

    setLoading(false);
  }, [periodRange.start, periodRange.end]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  async function simpanSaldoAwal() {
    if (savingSaldo) return;
    const nominal = parseKasNominal(saldoAwalInput || "0", true);

    if (nominal === null) {
      alert("Saldo awal harus berupa rupiah bulat nol atau lebih yang valid.");
      return;
    }

    setSavingSaldo(true);

    try {
      const payload = {
        bulan: periodRange.start,
        nominal,
        keterangan:
          keteranganSaldo.trim() || null,
      };

      if (saldoAwalData) {
        const { data: updatedRow, error } = await supabase
          .from("kas_saldo_awal")
          .update(payload)
          .eq("id", saldoAwalData.id)
          .select("id")
          .maybeSingle();

        requireMutationRow(updatedRow, error, "Gagal memperbarui saldo awal");
      } else {
        const { data: insertedRow, error } = await supabase
          .from("kas_saldo_awal")
          .insert(payload)
          .select("id")
          .maybeSingle();

        requireMutationRow(insertedRow, error, "Gagal menyimpan saldo awal");
      }

      await loadData();

      alert("Saldo awal berhasil disimpan.");
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan saldo awal."
      );
    } finally {
      setSavingSaldo(false);
    }
  }

  const cashflow = useMemo(
    () => summarizeKasCashflow(transaksi, ipk),
    [transaksi, ipk]
  );
  const totalPemasukan = cashflow.income;
  const totalPengeluaran = cashflow.expenses;

  const saldoAwal = saldoAwalData?.nominal ?? null;
  const saldoAkhir = calculateCashBalance(
    saldoAwal,
    totalPemasukan,
    totalPengeluaran,
  ).closingBalance;

  const totalIpk = cashflow.ipkBreakdown;
  const hasPeriodData = transaksi.length > 0 || ipk.length > 0 || saldoAwalData !== null;

  const rekapPengeluaran = useMemo(() => {
    return kategori
      .filter(
        (item) => item.jenis === "PENGELUARAN"
      )
      .map((item) => {
        const transaksiKategori = transaksi.filter(
          (trx) =>
            trx.jenis === "PENGELUARAN" &&
            trx.kategori_id === item.id
        );

        return {
          ...item,
          total: transaksiKategori.reduce(
            (sum, trx) => sum + trx.nominal,
            0
          ),
          jumlah: transaksiKategori.length,
        };
      })
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [kategori, transaksi]);

  return (
    <main className="min-h-screen bg-[var(--background)] pb-8">
      <div className="mx-auto max-w-5xl px-4 py-5">

        <div className="mb-5 -mx-4 -mt-5">
          <PageHeader eyebrow="Nuansa Indah Ciomas" title="Kas RW 16" subtitle="Dashboard keuangan RW" backHref="/" />
        </div>

        <PeriodFilter value={period} onChange={setPeriod} />
        {!loading && !hasPeriodData && <p role="status" className="type-helper rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-slate-600">Belum ada data kas atau IPK untuk periode {periodRange.label}.</p>}

        <section className="mb-5">
          <div className="mb-3">
            <h2 className="font-bold text-slate-900">
              Menu Kas
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {canManage ? "Kelola kas dan lihat laporan." : "Ringkasan kas RW 16 dan laporan."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">

            {canManage && <Link
              href="/kas/tambah?pemasukan=1"
              className="rounded-2xl bg-emerald-600 p-5 text-white shadow-sm transition hover:bg-emerald-700"
            >
              <p className="text-lg font-bold">
                ＋ Pemasukan
              </p>

              <p className="mt-1 text-sm text-emerald-100">
                Catat pemasukan selain IPK bulanan.
              </p>
            </Link>}

            {canManage && <Link
              href="/kas/tambah?pengeluaran=1"
              className="rounded-2xl bg-red-600 p-5 text-white shadow-sm transition hover:bg-red-700"
            >
              <p className="text-lg font-bold">
                − Pengeluaran
              </p>

              <p className="mt-1 text-sm text-red-100">
                Catat uang yang keluar dari Kas RW.
              </p>
            </Link>}

            <Link
              href="/kas/transaksi"
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
            >
              <p className="text-lg font-bold text-slate-900">
                Transaksi
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {canManage ? "Lihat dan kelola histori transaksi Kas." : "Lihat histori transaksi Kas."}
              </p>
            </Link>

            <Link
              href="/kas/ipk"
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
            >
              <p className="text-lg font-bold text-slate-900">
                IPK Warga
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Rekap pembayaran IPK per RT.
              </p>
            </Link>

            <Link
              href="/kas/laporan"
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
            >
              <p className="text-lg font-bold text-slate-900">
                Laporan
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Laporan kas dengan pilihan periode.
              </p>
            </Link>

            <Link
              href="/kas/rekap"
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
            >
              <p className="text-lg font-bold text-slate-900">
                Rekap Bulanan
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Lihat perkembangan kas per periode.
              </p>
            </Link>

            {canManage && <Link
              href="/kas/pengaturan"
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
            >
              <p className="text-lg font-bold text-slate-900">
                Pengaturan
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Kelola kategori Kas RW.
              </p>
            </Link>}

          </div>
        </section>

        <section className="mb-5 rounded-3xl bg-slate-900 p-5 text-white shadow-lg">

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-300">
                Saldo Kas RW
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {periodRange.label}
              </p>
            </div>

            <p
              className={`text-2xl font-bold ${
                saldoAkhir !== null && saldoAkhir >= 0
                  ? "text-emerald-300"
                  : saldoAkhir === null ? "text-amber-200" : "text-red-300"
              }`}
            >
              {saldoAkhir === null ? "Isi saldo awal" : formatRupiah(saldoAkhir)}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">

            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-xs text-slate-400">
                Saldo Awal
              </p>

              <p className="mt-1 text-sm font-bold">
                {saldoAwal === null ? "Belum diisi" : formatRupiah(saldoAwal)}
              </p>
            </div>

            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-xs text-slate-400">
                Pemasukan
              </p>

              <p className="mt-1 text-sm font-bold text-emerald-300">
                {hasPeriodData ? formatRupiah(totalPemasukan) : "—"}
              </p>
            </div>

            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-xs text-slate-400">
                Pengeluaran
              </p>

              <p className="mt-1 text-sm font-bold text-red-300">
                {hasPeriodData ? formatRupiah(totalPengeluaran) : "—"}
              </p>
            </div>

          </div>
        </section>

        {canManage && <section className="mb-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">

          <div className="mb-4">
            <h2 className="font-bold text-slate-900">
              Saldo Awal Periode
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Saldo awal dicatat untuk bulan pertama pada periode aktif.
            </p>
          </div>

          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Nominal Saldo Awal
          </label>

          <div className="overflow-hidden rounded-xl border border-slate-300">
            <div className="flex items-center">
              <span className="flex h-12 items-center border-r border-slate-200 bg-slate-100 px-4 text-sm font-bold text-slate-500">
                Rp
              </span>

              <input aria-label="Saldo awal"
                type="text"
                inputMode="numeric"
                value={saldoAwalInput}
                onChange={(e) => {
                  const angka = e.target.value.replace(
                    /\D/g,
                    ""
                  );

                  setSaldoAwalInput(
                    angka
                      ? Number(angka).toLocaleString("id-ID")
                      : ""
                  );
                }}
                placeholder="0"
                className="h-12 w-full px-4 text-right text-lg font-semibold text-slate-900 outline-none"
              />
            </div>
          </div>

          <label className="mb-2 mt-4 block text-sm font-semibold text-slate-700">
            Keterangan
          </label>

              <input aria-label="Keterangan saldo awal"
            type="text"
            value={keteranganSaldo}
            onChange={(e) =>
              setKeteranganSaldo(e.target.value)
            }
            placeholder="Contoh: Saldo akhir bulan sebelumnya"
            className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm text-slate-800 outline-none"
          />

          <button
            type="button"
            onClick={simpanSaldoAwal}
            disabled={savingSaldo}
            className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 font-bold text-white disabled:opacity-50"
          >
            {savingSaldo
              ? "Menyimpan..."
              : "Simpan Saldo Awal"}
          </button>
        </section>}

        <section className="mb-5 grid gap-3 sm:grid-cols-3">

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">
              Total Pemasukan
            </p>

            <p className="mt-2 text-xl font-bold text-emerald-600">
              {hasPeriodData ? formatRupiah(totalPemasukan) : "—"}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {transaksi.filter(
                (item) => item.jenis === "PEMASUKAN"
              ).length}{" "}
              transaksi
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">
              Total Pengeluaran
            </p>

            <p className="mt-2 text-xl font-bold text-red-600">
              {hasPeriodData ? formatRupiah(totalPengeluaran) : "—"}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {transaksi.filter(
                (item) => item.jenis === "PENGELUARAN"
              ).length}{" "}
              transaksi
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">
              IPK Terkumpul
            </p>

            <p className="mt-2 text-xl font-bold text-blue-600">
              {hasPeriodData ? formatRupiah(totalIpk) : "—"}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              RT 01–06 · rincian dari pemasukan
            </p>
          </div>

        </section>

        <section className="mb-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">

          <div className="mb-4">
            <h2 className="font-bold text-slate-900">
              Pengeluaran per Kategori
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Rekap penggunaan Kas RW berdasarkan kategori.
            </p>
          </div>

          {rekapPengeluaran.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
              Belum ada pengeluaran pada periode ini.
            </div>
          ) : (
            <div className="space-y-3">
              {rekapPengeluaran.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      {item.nama}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {item.jumlah} transaksi
                    </p>
                  </div>

                  <p className="shrink-0 text-sm font-bold text-red-600">
                    {formatRupiah(item.total)}
                  </p>
                </div>
              ))}
            </div>
          )}

        </section>

        <section className="mb-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">

          <div className="mb-4">
            <h2 className="font-bold text-slate-900">
              IPK per RT
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Rekap IPK warga pada periode aktif.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">

            {RT_LIST.map((rt) => {
              const row = ipk.find(
                (item) => item.rt === rt
              );

              const nominal =
                row?.terkumpul || 0;

              return (
                <div
                  key={rt}
                  className="rounded-xl bg-slate-50 p-4"
                >
                  <p className="text-sm font-bold text-slate-700">
                    RT {rt}
                  </p>

                  <p className="mt-2 text-base font-bold text-blue-600">
                    {formatRupiah(nominal)}
                  </p>
                </div>
              );
            })}

          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">

          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900">
                Transaksi Terbaru
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Transaksi Kas pada {periodRange.label}.
              </p>
            </div>

            <Link
              href="/kas/transaksi"
              className="shrink-0 text-sm font-bold text-slate-700 underline"
            >
              Lihat Semua
            </Link>
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">
              Memuat transaksi...
            </div>
          ) : transaksi.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
              Belum ada transaksi pada periode ini.
            </div>
          ) : (
            <div className="space-y-3">
              {transaksi.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 type-status font-bold ${
                          item.jenis === "PEMASUKAN"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {item.jenis}
                      </span>

                      <span className="text-xs text-slate-400">
                        {formatTanggal(item.tanggal)}
                      </span>
                    </div>

                    <p className="mt-2 break-words text-sm font-semibold text-slate-800">
                      {item.keterangan}
                    </p>

                    {item.rt && (
                      <p className="mt-1 text-xs text-slate-500">
                        RT {item.rt}
                      </p>
                    )}
                  </div>

                  <p
                    className={`shrink-0 text-sm font-bold ${
                      item.jenis === "PEMASUKAN"
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    {item.jenis === "PEMASUKAN"
                      ? "+"
                      : "−"}{" "}
                    {formatRupiah(item.nominal)}
                  </p>
                </div>
              ))}
            </div>
          )}

        </section>

      </div>
    </main>
  );
}
