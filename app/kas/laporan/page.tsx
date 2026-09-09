"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type Kategori = {
  id: number;
  nama: string;
  jenis: "PEMASUKAN" | "PENGELUARAN";
};

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
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatBulan(value: string) {
  return new Date(value + "-01").toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

function formatTanggalPdf(value: string) {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatRupiahPdf(value: number) {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function LaporanKasPage() {
  const [bulan, setBulan] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [ipk, setIpk] = useState<Ipk[]>([]);
  const [saldoAwal, setSaldoAwal] = useState<SaldoAwal | null>(null);

  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const awalBulan = `${bulan}-01`;

  const akhirBulan = new Date(
    Number(bulan.slice(0, 4)),
    Number(bulan.slice(5, 7)),
    0
  )
    .toISOString()
    .slice(0, 10);

  async function loadData() {
    setLoading(true);

    const [
      transaksiRes,
      kategoriRes,
      ipkRes,
      saldoRes,
    ] = await Promise.all([
      supabase
        .from("kas_transaksi")
        .select("*")
        .gte("tanggal", awalBulan)
        .lte("tanggal", akhirBulan)
        .order("tanggal", { ascending: true })
        .order("id", { ascending: true }),

      supabase
        .from("kas_kategori")
        .select("id, nama, jenis")
        .order("nama"),

      supabase
        .from("kas_ipk")
        .select("id, bulan, rt, terkumpul")
        .eq("bulan", awalBulan)
        .order("rt"),

      supabase
        .from("kas_saldo_awal")
        .select("*")
        .eq("bulan", awalBulan)
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

    if (saldoRes.error) {
      console.error(saldoRes.error);
      alert("Gagal mengambil saldo awal.");
      setLoading(false);
      return;
    }

    setTransaksi(
      (transaksiRes.data || []).map((item) => ({
        ...item,
        nominal: Number(item.nominal || 0),
      }))
    );

    setKategori(kategoriRes.data || []);

    setIpk(
      (ipkRes.data || []).map((item) => ({
        ...item,
        terkumpul: Number(item.terkumpul || 0),
      }))
    );

    setSaldoAwal(saldoRes.data || null);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [bulan]);

  function namaKategori(id: number | null) {
    if (!id) return "-";

    return (
      kategori.find((item) => item.id === id)?.nama ||
      "-"
    );
  }

  const nilaiSaldoAwal = Number(
    saldoAwal?.nominal || 0
  );

  const totalPemasukan = useMemo(
    () =>
      transaksi
        .filter((item) => item.jenis === "PEMASUKAN")
        .reduce(
          (total, item) => total + item.nominal,
          0
        ),
    [transaksi]
  );

  const totalPengeluaran = useMemo(
    () =>
      transaksi
        .filter((item) => item.jenis === "PENGELUARAN")
        .reduce(
          (total, item) => total + item.nominal,
          0
        ),
    [transaksi]
  );

  const saldoAkhir =
    nilaiSaldoAwal +
    totalPemasukan -
    totalPengeluaran;

  const totalIpk = useMemo(
    () =>
      ipk.reduce(
        (total, item) => total + item.terkumpul,
        0
      ),
    [ipk]
  );

  const rekapKategori = useMemo(() => {
    const map = new Map<
      string,
      {
        nama: string;
        jenis: string;
        total: number;
      }
    >();

    transaksi.forEach((item) => {
      const nama = namaKategori(item.kategori_id);

      const key = `${item.jenis}-${nama}`;

      const sebelumnya = map.get(key);

      map.set(key, {
        nama,
        jenis: item.jenis,
        total:
          (sebelumnya?.total || 0) +
          item.nominal,
      });
    });

    return Array.from(map.values()).sort(
      (a, b) => b.total - a.total
    );
  }, [transaksi, kategori]);

  async function downloadPdf() {
    if (loading) {
      alert("Tunggu sampai laporan selesai dimuat.");
      return;
    }

    try {
      setGeneratingPdf(true);

      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import(
        "jspdf-autotable"
      );

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const margin = 12;
      let y = 14;

      // =========================
      // HEADER
      // =========================

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(
        "LAPORAN KEUANGAN",
        pageWidth / 2,
        y,
        { align: "center" }
      );

      y += 6;

      doc.setFontSize(17);
      doc.text(
        "RW 16 NUANSA INDAH CIOMAS",
        pageWidth / 2,
        y,
        { align: "center" }
      );

      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(
        `Periode ${formatBulan(bulan)}`,
        pageWidth / 2,
        y,
        { align: "center" }
      );

      y += 5;

      doc.setLineWidth(0.7);
      doc.line(
        margin,
        y,
        pageWidth - margin,
        y
      );

      y += 8;

      // =========================
      // RINGKASAN
      // =========================

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Ringkasan Kas", margin, y);

      y += 5;

      autoTable(doc, {
        startY: y,
        margin: {
          left: margin,
          right: margin,
        },
        theme: "grid",
        head: [
          [
            "Saldo Awal",
            "Total Pemasukan",
            "Total Pengeluaran",
            "Saldo Akhir",
          ],
        ],
        body: [
          [
            `Rp ${formatRupiahPdf(nilaiSaldoAwal)}`,
            `Rp ${formatRupiahPdf(totalPemasukan)}`,
            `Rp ${formatRupiahPdf(totalPengeluaran)}`,
            `Rp ${formatRupiahPdf(saldoAkhir)}`,
          ],
        ],
        styles: {
          font: "helvetica",
          fontSize: 9,
          cellPadding: 4,
          halign: "center",
          valign: "middle",
        },
        headStyles: {
          fontStyle: "bold",
        },
      });

      y =
        (doc as any).lastAutoTable.finalY + 8;

      // =========================
      // RUMUS
      // =========================

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      doc.text(
        `Perhitungan: Rp ${formatRupiahPdf(
          nilaiSaldoAwal
        )} + Rp ${formatRupiahPdf(
          totalPemasukan
        )} - Rp ${formatRupiahPdf(
          totalPengeluaran
        )} = Rp ${formatRupiahPdf(saldoAkhir)}`,
        margin,
        y
      );

      y += 8;

      // =========================
      // REKAP KATEGORI
      // =========================

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Rekap Transaksi", margin, y);

      y += 4;

      autoTable(doc, {
        startY: y,
        margin: {
          left: margin,
          right: margin,
        },
        theme: "striped",
        head: [
          ["Jenis", "Kategori", "Jumlah"],
        ],
        body:
          rekapKategori.length > 0
            ? rekapKategori.map((item) => [
                item.jenis,
                item.nama,
                `Rp ${formatRupiahPdf(
                  item.total
                )}`,
              ])
            : [["-", "Belum ada transaksi", "-"]],
        styles: {
          font: "helvetica",
          fontSize: 8,
          cellPadding: 2.5,
        },
        columnStyles: {
          0: {
            cellWidth: 40,
          },
          1: {
            cellWidth: "auto",
          },
          2: {
            cellWidth: 55,
            halign: "right",
          },
        },
      });

      y =
        (doc as any).lastAutoTable.finalY + 8;

      // =========================
      // DETAIL TRANSAKSI
      // =========================

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(
        "Detail Transaksi",
        margin,
        y
      );

      y += 4;

      autoTable(doc, {
        startY: y,
        margin: {
          left: margin,
          right: margin,
        },
        theme: "grid",
        head: [
          [
            "Tanggal",
            "Jenis",
            "Kategori",
            "Keterangan",
            "RT",
            "Sumber / Penerima",
            "Nominal",
          ],
        ],
        body:
          transaksi.length > 0
            ? transaksi.map((item) => [
                formatTanggalPdf(item.tanggal),
                item.jenis,
                namaKategori(item.kategori_id),
                item.keterangan,
                item.rt
                  ? `RT ${item.rt}`
                  : "-",
                item.jenis === "PEMASUKAN"
                  ? item.sumber || "-"
                  : item.penerima || "-",
                `Rp ${formatRupiahPdf(
                  item.nominal
                )}`,
              ])
            : [
                [
                  "-",
                  "-",
                  "-",
                  "Belum ada transaksi",
                  "-",
                  "-",
                  "-",
                ],
              ],
        styles: {
          font: "helvetica",
          fontSize: 7.5,
          cellPadding: 2.2,
          valign: "middle",
        },
        headStyles: {
          fontStyle: "bold",
        },
        columnStyles: {
          0: {
            cellWidth: 25,
          },
          1: {
            cellWidth: 28,
          },
          2: {
            cellWidth: 42,
          },
          3: {
            cellWidth: 70,
          },
          4: {
            cellWidth: 20,
          },
          5: {
            cellWidth: 45,
          },
          6: {
            cellWidth: 38,
            halign: "right",
          },
        },
      });

      // =========================
      // IPK
      // =========================

      doc.addPage();

      y = 15;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(
        "REKAP IPK WARGA",
        pageWidth / 2,
        y,
        { align: "center" }
      );

      y += 7;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(
        `RW 16 Nuansa Indah Ciomas — ${formatBulan(
          bulan
        )}`,
        pageWidth / 2,
        y,
        { align: "center" }
      );

      y += 8;

      autoTable(doc, {
        startY: y,
        margin: {
          left: 45,
          right: 45,
        },
        theme: "grid",
        head: [
          ["RT", "IPK Terkumpul"],
        ],
        body: RT_LIST.map((rt) => {
          const item = ipk.find(
            (data) => data.rt === rt
          );

          return [
            `RT ${rt}`,
            `Rp ${formatRupiahPdf(
              Number(item?.terkumpul || 0)
            )}`,
          ];
        }),
        foot: [
          [
            "TOTAL IPK RW 16",
            `Rp ${formatRupiahPdf(totalIpk)}`,
          ],
        ],
        styles: {
          font: "helvetica",
          fontSize: 10,
          cellPadding: 4,
        },
        headStyles: {
          fontStyle: "bold",
        },
        footStyles: {
          fontStyle: "bold",
        },
        columnStyles: {
          0: {
            cellWidth: 70,
          },
          1: {
            halign: "right",
          },
        },
      });

      y =
        (doc as any).lastAutoTable.finalY + 18;

      // =========================
      // TANDA TANGAN
      // =========================

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      doc.text(
        "Bendahara RW 16",
        pageWidth * 0.28,
        y,
        { align: "center" }
      );

      doc.text(
        "Ketua RW 16",
        pageWidth * 0.72,
        y,
        { align: "center" }
      );

      y += 25;

      doc.setLineWidth(0.3);

      doc.line(
        pageWidth * 0.17,
        y,
        pageWidth * 0.39,
        y
      );

      doc.line(
        pageWidth * 0.61,
        y,
        pageWidth * 0.83,
        y
      );

      y += 5;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);

      doc.text(
        "( __________________ )",
        pageWidth * 0.28,
        y,
        { align: "center" }
      );

      doc.text(
        "( __________________ )",
        pageWidth * 0.72,
        y,
        { align: "center" }
      );

      // =========================
      // FOOTER
      // =========================

      const totalPages =
        (doc as any).internal.getNumberOfPages();

      for (
        let page = 1;
        page <= totalPages;
        page++
      ) {
        doc.setPage(page);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(100);

        doc.text(
          `Laporan Kas RW 16 — Nuansa Indah Ciomas`,
          margin,
          pageHeight - 7
        );

        doc.text(
          `Halaman ${page} dari ${totalPages}`,
          pageWidth - margin,
          pageHeight - 7,
          { align: "right" }
        );
      }

      // =========================
      // DOWNLOAD
      // =========================

      const namaBulan = new Date(
        `${bulan}-01`
      )
        .toLocaleDateString("id-ID", {
          month: "long",
        })
        .replace(/\s+/g, "-");

      const tahun = bulan.slice(0, 4);

      doc.save(
        `Laporan-Kas-RW16-${namaBulan}-${tahun}.pdf`
      );
    } catch (error) {
      console.error(error);
      alert(
        "Gagal membuat PDF. Pastikan package PDF sudah terpasang."
      );
    } finally {
      setGeneratingPdf(false);
    }
  }

  function cetakLaporan() {
    window.print();
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-24">
      <div className="mx-auto max-w-5xl px-4 py-5">

        {/* HEADER */}
        <div className="mb-5 flex items-start justify-between gap-3 print:hidden">
          <div>
            <p className="text-sm font-semibold text-slate-600">
              Kas RW 16
            </p>

            <h1 className="text-2xl font-bold text-slate-950">
              Laporan Kas
            </h1>

            <p className="mt-1 text-sm font-medium text-slate-600">
              Laporan keuangan RW 16
            </p>
          </div>

          <Link
            href="/kas"
            className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-sm ring-1 ring-slate-300"
          >
            ← Kas
          </Link>
        </div>

        {/* FILTER */}
        <section className="mb-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-300 print:hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-800">
                Periode Laporan
              </label>

              <input
                type="month"
                value={bulan}
                onChange={(e) =>
                  setBulan(e.target.value)
                }
                className="rounded-xl border border-slate-400 bg-white px-3 py-3 font-medium text-slate-900 outline-none focus:border-slate-700"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={downloadPdf}
                disabled={
                  loading || generatingPdf
                }
                className="rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generatingPdf
                  ? "⏳ Membuat PDF..."
                  : "📄 Download PDF"}
              </button>

              <button
                type="button"
                onClick={cetakLaporan}
                disabled={loading}
                className="rounded-xl bg-slate-200 px-5 py-3 font-bold text-slate-900 transition hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                🖨️ Print
              </button>
            </div>
          </div>
        </section>

        {/* DOKUMEN */}
        <div
          id="laporan-kas"
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-300 print:rounded-none print:p-0 print:shadow-none print:ring-0"
        >

          {/* IDENTITAS */}
          <header className="border-b-2 border-slate-950 pb-4 text-center">
            <p className="text-sm font-bold uppercase tracking-wide text-slate-700">
              Laporan Keuangan
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-950">
              RW 16 NUANSA INDAH CIOMAS
            </h1>

            <p className="mt-1 text-sm font-semibold text-slate-700">
              Periode {formatBulan(bulan)}
            </p>
          </header>

          {loading ? (
            <div className="py-16 text-center text-sm font-medium text-slate-600">
              Memuat laporan...
            </div>
          ) : (
            <>
              {/* RINGKASAN */}
              <section className="mt-6">
                <h2 className="mb-3 text-lg font-bold text-slate-950">
                  Ringkasan Kas
                </h2>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-slate-300 p-4">
                    <p className="text-xs font-bold text-slate-700">
                      Saldo Awal
                    </p>

                    <p className="mt-2 text-lg font-bold text-slate-950">
                      {formatRupiah(
                        nilaiSaldoAwal
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
                    <p className="text-xs font-bold text-emerald-800">
                      Pemasukan
                    </p>

                    <p className="mt-2 text-lg font-bold text-emerald-800">
                      {formatRupiah(
                        totalPemasukan
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border border-red-300 bg-red-50 p-4">
                    <p className="text-xs font-bold text-red-800">
                      Pengeluaran
                    </p>

                    <p className="mt-2 text-lg font-bold text-red-800">
                      {formatRupiah(
                        totalPengeluaran
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border-2 border-slate-950 bg-slate-900 p-4 text-white">
                    <p className="text-xs font-bold text-slate-200">
                      Saldo Akhir
                    </p>

                    <p className="mt-2 text-lg font-bold">
                      {formatRupiah(saldoAkhir)}
                    </p>
                  </div>
                </div>

                {saldoAwal?.keterangan && (
                  <p className="mt-3 text-xs font-medium text-slate-600">
                    Keterangan saldo awal:{" "}
                    {saldoAwal.keterangan}
                  </p>
                )}
              </section>

              {/* RUMUS */}
              <section className="mt-5 rounded-xl border border-slate-300 bg-slate-50 p-4 text-center">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
                  Perhitungan Saldo
                </p>

                <p className="mt-2 text-sm font-bold text-slate-950">
                  {formatRupiah(
                    nilaiSaldoAwal
                  )}
                  {" + "}
                  {formatRupiah(
                    totalPemasukan
                  )}
                  {" − "}
                  {formatRupiah(
                    totalPengeluaran
                  )}
                  {" = "}
                  {formatRupiah(saldoAkhir)}
                </p>
              </section>

              {/* REKAP KATEGORI */}
              <section className="mt-7">
                <h2 className="mb-3 text-lg font-bold text-slate-950">
                  Rekap Transaksi
                </h2>

                {rekapKategori.length === 0 ? (
                  <div className="rounded-xl border border-slate-300 p-5 text-center text-sm font-medium text-slate-600">
                    Belum ada transaksi pada periode ini.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-300">
                    <table className="w-full min-w-[620px] border-collapse text-sm text-slate-950">
                      <thead className="bg-slate-200 text-slate-950">
                        <tr>
                          <th className="w-[150px] whitespace-nowrap px-4 py-3 text-left font-bold">
                            Jenis
                          </th>

                          <th className="min-w-[260px] px-4 py-3 text-left font-bold">
                            Kategori
                          </th>

                          <th className="w-[180px] whitespace-nowrap px-4 py-3 text-right font-bold">
                            Jumlah
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {rekapKategori.map(
                          (item, index) => (
                            <tr
                              key={`${item.jenis}-${item.nama}-${index}`}
                              className="border-t border-slate-300"
                            >
                              <td className="whitespace-nowrap px-4 py-3">
                                <span
                                  className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${
                                    item.jenis ===
                                    "PEMASUKAN"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {item.jenis}
                                </span>
                              </td>

                              <td className="px-4 py-3 font-semibold text-slate-950">
                                {item.nama}
                              </td>

                              <td
                                className={`whitespace-nowrap px-4 py-3 text-right font-bold ${
                                  item.jenis ===
                                  "PEMASUKAN"
                                    ? "text-emerald-700"
                                    : "text-red-700"
                                }`}
                              >
                                {formatRupiah(
                                  item.total
                                )}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* DETAIL TRANSAKSI */}
              <section className="mt-7">
                <h2 className="mb-3 text-lg font-bold text-slate-950">
                  Detail Transaksi
                </h2>

                {transaksi.length === 0 ? (
                  <div className="rounded-xl border border-slate-300 p-5 text-center text-sm font-medium text-slate-600">
                    Belum ada transaksi.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-300">
                    <table className="w-full min-w-[950px] border-collapse text-sm text-slate-950">
                      <thead className="bg-slate-200 text-slate-950">
                        <tr>
                          <th className="w-[120px] whitespace-nowrap px-3 py-3 text-left font-bold">
                            Tanggal
                          </th>

                          <th className="w-[150px] whitespace-nowrap px-3 py-3 text-left font-bold">
                            Jenis
                          </th>

                          <th className="w-[180px] whitespace-nowrap px-3 py-3 text-left font-bold">
                            Kategori
                          </th>

                          <th className="min-w-[260px] px-3 py-3 text-left font-bold">
                            Keterangan
                          </th>

                          <th className="w-[90px] whitespace-nowrap px-3 py-3 text-left font-bold">
                            RT
                          </th>

                          <th className="w-[190px] whitespace-nowrap px-3 py-3 text-right font-bold">
                            Nominal
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {transaksi.map((item) => (
                          <tr
                            key={item.id}
                            className="border-t border-slate-300"
                          >
                            <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-900">
                              {formatTanggal(
                                item.tanggal
                              )}
                            </td>

                            <td className="whitespace-nowrap px-3 py-3">
                              <span
                                className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-xs font-bold ${
                                  item.jenis ===
                                  "PEMASUKAN"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {item.jenis}
                              </span>
                            </td>

                            <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-900">
                              {namaKategori(
                                item.kategori_id
                              )}
                            </td>

                            <td className="min-w-[260px] px-3 py-3 font-semibold text-slate-950">
                              {item.keterangan}
                            </td>

                            <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-900">
                              {item.rt
                                ? `RT ${item.rt}`
                                : "-"}
                            </td>

                            <td
                              className={`whitespace-nowrap px-3 py-3 text-right font-bold ${
                                item.jenis ===
                                "PEMASUKAN"
                                  ? "text-emerald-700"
                                  : "text-red-700"
                              }`}
                            >
                              {formatRupiah(
                                item.nominal
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* IPK */}
              <section className="mt-7">
                <h2 className="mb-3 text-lg font-bold text-slate-950">
                  Rekap IPK Warga
                </h2>

                <div className="overflow-x-auto rounded-xl border border-slate-300">
                  <table className="w-full min-w-[520px] border-collapse text-sm text-slate-950">
                    <thead className="bg-slate-200 text-slate-950">
                      <tr>
                        <th className="w-[180px] whitespace-nowrap px-4 py-3 text-left font-bold text-slate-950">
                          RT
                        </th>

                        <th className="w-[300px] whitespace-nowrap px-4 py-3 text-right font-bold text-slate-950">
                          IPK Terkumpul
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {RT_LIST.map((rt) => {
                        const item = ipk.find(
                          (data) => data.rt === rt
                        );

                        return (
                          <tr
                            key={rt}
                            className="border-t border-slate-300"
                          >
                            <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-950">
                              RT {rt}
                            </td>

                            <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-slate-950">
                              {formatRupiah(
                                Number(
                                  item?.terkumpul || 0
                                )
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      <tr className="border-t-2 border-slate-950 bg-slate-100">
                        <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-950">
                          TOTAL IPK RW 16
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-slate-950">
                          {formatRupiah(totalIpk)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* TANDA TANGAN */}
              <section className="mt-12 grid grid-cols-2 gap-8 text-center">
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Bendahara RW 16
                  </p>

                  <div className="h-24" />

                  <div className="mx-auto w-48 border-t border-slate-700 pt-2">
                    <p className="text-sm font-semibold text-slate-950">
                      ( __________________ )
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Ketua RW 16
                  </p>

                  <div className="h-24" />

                  <div className="mx-auto w-48 border-t border-slate-700 pt-2">
                    <p className="text-sm font-semibold text-slate-950">
                      ( __________________ )
                    </p>
                  </div>
                </div>
              </section>

              <p className="mt-8 text-center text-xs font-medium text-slate-500">
                Laporan Kas RW 16 — Nuansa Indah Ciomas
              </p>
            </>
          )}
        </div>
      </div>

      {/* PRINT CSS */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 12mm;
          }

          body {
            background: white !important;
          }

          main {
            min-height: auto !important;
            padding: 0 !important;
          }

          #laporan-kas {
            width: 100% !important;
          }

          .print\\:hidden {
            display: none !important;
          }

          #laporan-kas .overflow-x-auto {
            overflow: visible !important;
          }

          #laporan-kas table {
            min-width: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>
    </main>
  );
}