"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type IpkRow = {
  id: number | null;
  bulan: string;
  rt: string;
  terkumpul: number;
};

const RT_LIST = ["01", "02", "03", "04", "05", "06"];

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function angkaRupiah(value: string) {
  return value.replace(/\D/g, "");
}

function formatInput(value: number) {
  if (!value) return "";
  return value.toLocaleString("id-ID");
}

function formatBulan(value: string) {
  return new Date(value + "-01").toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

export default function IpkPage() {
  const [bulan, setBulan] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [data, setData] = useState<IpkRow[]>(
    RT_LIST.map((rt) => ({
      id: null,
      bulan: "",
      rt,
      terkumpul: 0,
    }))
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const awalBulan = `${bulan}-01`;

  async function loadData() {
    setLoading(true);
    setSaved(false);

    const { data: hasil, error } = await supabase
      .from("kas_ipk")
      .select("*")
      .eq("bulan", awalBulan)
      .order("rt");

    if (error) {
      console.error(error);
      alert("Gagal mengambil data IPK.");
      setLoading(false);
      return;
    }

    const hasilMap = new Map(
      (hasil || []).map((item) => [item.rt, item])
    );

    setData(
      RT_LIST.map((rt) => {
        const item = hasilMap.get(rt);

        return {
          id: item?.id || null,
          bulan: awalBulan,
          rt,
          terkumpul: Number(item?.terkumpul || 0),
        };
      })
    );

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [bulan]);

  function ubahTerkumpul(index: number, value: string) {
    const angka = Number(angkaRupiah(value) || 0);

    setSaved(false);

    setData((sebelumnya) =>
      sebelumnya.map((item, i) =>
        i === index
          ? {
              ...item,
              terkumpul: angka,
            }
          : item
      )
    );
  }

  async function simpanSemua() {
    if (saving || loading) return;

    setSaving(true);
    setSaved(false);

    try {
      /*
       * =====================================================
       * 1. AMBIL KATEGORI IPK BULANAN
       * =====================================================
       */

      const { data: kategori, error: kategoriError } = await supabase
        .from("kas_kategori")
        .select("id, nama, jenis")
        .eq("jenis", "PEMASUKAN")
        .ilike("nama", "IPK Bulanan")
        .limit(1)
        .maybeSingle();

      if (kategoriError) {
        throw new Error(
          `Gagal mengambil kategori IPK Bulanan: ${kategoriError.message}`
        );
      }

      if (!kategori) {
        throw new Error(
          'Kategori "IPK Bulanan" belum tersedia di kas_kategori.'
        );
      }

      /*
       * =====================================================
       * 2. SIMPAN REKAP IPK PER RT
       * =====================================================
       */

      const payload = data.map((item) => ({
        bulan: awalBulan,
        rt: item.rt,
        target: 0,
        terkumpul: item.terkumpul,
      }));

      const { data: hasil, error: ipkError } = await supabase
        .from("kas_ipk")
        .upsert(payload, {
          onConflict: "bulan,rt",
        })
        .select("*");

      if (ipkError) {
        throw new Error(
          `Gagal menyimpan IPK: ${ipkError.message}`
        );
      }

      /*
       * =====================================================
       * 3. SINKRONISASI IPK → TRANSAKSI KAS
       *
       * Tidak menggunakan ON CONFLICT kas_ipk_id.
       *
       * Logika:
       * - transaksi sudah ada → UPDATE
       * - transaksi belum ada → INSERT
       * - IPK = 0 → hapus transaksi IPK
       * =====================================================
       */

      for (const item of hasil || []) {
        const nominal = Number(item.terkumpul || 0);

        const keterangan = `IPK Bulanan RT ${item.rt} - ${formatBulan(
          bulan
        )}`;

        /*
         * Cari transaksi yang sudah terhubung
         */
        const { data: transaksiLama, error: cariError } = await supabase
          .from("kas_transaksi")
          .select("id")
          .eq("kas_ipk_id", item.id)
          .maybeSingle();

        if (cariError) {
          throw new Error(
            `Gagal mencari transaksi IPK RT ${item.rt}: ${cariError.message}`
          );
        }

        /*
         * =================================================
         * IPK > 0
         * =================================================
         */

        if (nominal > 0) {
          /*
           * UPDATE TRANSAKSI LAMA
           */
          if (transaksiLama) {
            const { error: updateError } = await supabase
              .from("kas_transaksi")
              .update({
                tanggal: awalBulan,
                jenis: "PEMASUKAN",
                kategori_id: kategori.id,
                keterangan,
                nominal,
                rt: item.rt,
                sumber: "IPK Warga",
              })
              .eq("id", transaksiLama.id);

            if (updateError) {
              throw new Error(
                `Gagal memperbarui transaksi IPK RT ${item.rt}: ${updateError.message}`
              );
            }
          }

          /*
           * INSERT TRANSAKSI BARU
           */
          else {
            const { error: insertError } = await supabase
              .from("kas_transaksi")
              .insert({
                kas_ipk_id: item.id,
                tanggal: awalBulan,
                jenis: "PEMASUKAN",
                kategori_id: kategori.id,
                keterangan,
                nominal,
                rt: item.rt,
                sumber: "IPK Warga",
              });

            if (insertError) {
              throw new Error(
                `Gagal membuat transaksi IPK RT ${item.rt}: ${insertError.message}`
              );
            }
          }
        }

        /*
         * =================================================
         * IPK = 0
         *
         * Hapus transaksi IPK yang sebelumnya ada.
         * =================================================
         */

        else if (transaksiLama) {
          const { error: hapusError } = await supabase
            .from("kas_transaksi")
            .delete()
            .eq("id", transaksiLama.id);

          if (hapusError) {
            throw new Error(
              `Gagal menghapus transaksi IPK RT ${item.rt}: ${hapusError.message}`
            );
          }
        }
      }

      /*
       * =====================================================
       * 4. REFRESH ID DATA
       * =====================================================
       */

      const hasilMap = new Map(
        (hasil || []).map((item) => [item.rt, item])
      );

      setData((sebelumnya) =>
        sebelumnya.map((item) => {
          const tersimpan = hasilMap.get(item.rt);

          return tersimpan
            ? {
                ...item,
                id: tersimpan.id,
                bulan: tersimpan.bulan,
              }
            : item;
        })
      );

      setSaved(true);
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan rekap IPK."
      );
    } finally {
      setSaving(false);
    }
  }

  const totalTerkumpul = useMemo(
    () =>
      data.reduce(
        (total, item) => total + item.terkumpul,
        0
      ),
    [data]
  );

  const jumlahRTTerisi = useMemo(
    () =>
      data.filter(
        (item) => Number(item.terkumpul) > 0
      ).length,
    [data]
  );

  return (
    <main className="min-h-screen bg-slate-100 pb-24">
      <div className="mx-auto max-w-3xl px-4 py-5">

        {/* HEADER */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Kas RW 16
            </p>

            <h1 className="text-2xl font-bold text-slate-900">
              IPK Warga
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Rekap IPK terkumpul per RT
            </p>
          </div>

          <Link
            href="/kas"
            className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200"
          >
            ← Kas
          </Link>
        </div>

        {/* PERIODE */}
        <section className="mb-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Periode IPK
          </label>

          <input
            type="month"
            value={bulan}
            onChange={(e) => setBulan(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-800 outline-none focus:border-slate-500 sm:w-auto"
          />

          <p className="mt-2 text-xs text-slate-500">
            Pilih bulan untuk melihat atau mengubah rekap IPK.
          </p>
        </section>

        {/* TOTAL */}
        <section className="mb-5 rounded-3xl bg-slate-900 p-6 text-white shadow-lg">
          <p className="text-sm text-slate-300">
            Total IPK Terkumpul
          </p>

          <p className="mt-1 text-3xl font-bold">
            {formatRupiah(totalTerkumpul)}
          </p>

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm text-slate-400">
              {formatBulan(bulan)}
            </p>

            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-300">
              {jumlahRTTerisi} / 6 RT terisi
            </span>
          </div>
        </section>

        {/* INPUT IPK */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">

          <div className="mb-5">
            <h2 className="font-bold text-slate-900">
              IPK Per RT
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Masukkan jumlah IPK yang sudah terkumpul
              masing-masing RT.
            </p>
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">
              Memuat data IPK...
            </div>
          ) : (
            <div className="space-y-3">
              {data.map((item, index) => (
                <div
                  key={item.rt}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  {/* RT HEADER */}
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold text-slate-900">
                        RT {item.rt}
                      </p>

                      <p className="text-xs text-slate-500">
                        IPK terkumpul
                      </p>
                    </div>

                    {item.id ? (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Tersimpan
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">
                        Belum disimpan
                      </span>
                    )}
                  </div>

                  {/* NOMINAL */}
                  <div className="overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-slate-500">
                    <div className="flex items-center">
                      <span className="flex h-12 items-center border-r border-slate-200 bg-slate-100 px-4 text-sm font-bold text-slate-500">
                        Rp
                      </span>

                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatInput(item.terkumpul)}
                        onChange={(e) =>
                          ubahTerkumpul(
                            index,
                            e.target.value
                          )
                        }
                        placeholder="0"
                        className="h-12 w-full min-w-0 px-4 text-right text-lg font-semibold text-slate-900 outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TOTAL BAWAH */}
          {!loading && (
            <div className="mt-5 rounded-2xl bg-slate-100 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Total IPK RW 16
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    RT 01 sampai RT 06
                  </p>
                </div>

                <p className="text-lg font-bold text-slate-900">
                  {formatRupiah(totalTerkumpul)}
                </p>
              </div>
            </div>
          )}

          {/* STATUS SIMPAN */}
          {saved && (
            <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700">
              ✓ Rekap IPK & pemasukan Kas berhasil disimpan
            </div>
          )}

          {/* BUTTON */}
          <button
            type="button"
            onClick={simpanSemua}
            disabled={saving || loading}
            className="mt-5 w-full rounded-2xl bg-slate-900 px-4 py-4 text-base font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Menyimpan..."
              : "Simpan Rekap IPK"}
          </button>

        </section>

        {/* INFO */}
        <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800 ring-1 ring-blue-100">
          <p className="font-semibold">
            Catatan
          </p>

          <p className="mt-1 leading-relaxed">
            IPK dicatat berdasarkan jumlah uang yang sudah
            terkumpul dari masing-masing RT. Saat disimpan,
            IPK otomatis dicatat sebagai pemasukan Kas RW
            kategori IPK Bulanan.
          </p>
        </div>

      </div>
    </main>
  );
}