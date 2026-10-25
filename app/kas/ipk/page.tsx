"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { toLocalMonthString } from "@/lib/date";
import { buildIpkRpcPayload } from "@/lib/kas/ipk-payload.mjs";
import { calculateIpkTotal } from "@/lib/kas/ipk-total.mjs";
import { PageHeader } from "@/components/ui/AppShell";
import { useKasAuthority } from "@/lib/kas/use-kas-authority";

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
  const { canManage } = useKasAuthority();
  const [bulan, setBulan] = useState(toLocalMonthString);

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

  const loadData = useCallback(async () => {
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
  }, [awalBulan]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

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
      const payload = buildIpkRpcPayload(bulan, data, formatBulan(bulan));

      // The RPC makes the rekap and its linked cash entries one database transaction.
      const { data: hasil, error: ipkError } = await supabase.rpc(
        "save_kas_ipk_month",
        payload
      );

      if (ipkError || !hasil) {
        throw new Error(`Gagal menyimpan IPK: ${ipkError?.message ?? "respons database kosong"}`);
      }

      const hasilRows = hasil as IpkRow[];

      /*
       * =====================================================
       * 4. REFRESH ID DATA
       * =====================================================
       */

      const hasilMap = new Map(
        hasilRows.map((item) => [item.rt, item])
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

  const totalTerkumpul = useMemo(() => calculateIpkTotal(data), [data]);

  const jumlahRTTerisi = useMemo(
    () =>
      data.filter(
        (item) => Number(item.terkumpul) > 0
      ).length,
    [data]
  );

  return (
    <main className="min-h-screen bg-[var(--background)] pb-8">
      <div className="mx-auto max-w-3xl px-4 py-5">

        <PageHeader eyebrow="Kas RW 16" title="IPK Warga" subtitle="Rekap IPK terkumpul per RT" backHref="/kas" />

        {/* PERIODE */}
        <section className="mb-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Periode IPK
          </label>

          <input aria-label="Periode IPK"
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
            {totalTerkumpul === null ? "Total di luar batas angka aman" : formatRupiah(totalTerkumpul)}
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
              {canManage
                ? "Masukkan jumlah IPK yang sudah terkumpul masing-masing RT."
                : "Rekap IPK yang tercatat untuk masing-masing RT."}
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
                        readOnly={!canManage}
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
                  {totalTerkumpul === null ? "—" : formatRupiah(totalTerkumpul)}
                </p>
              </div>
            </div>
          )}

          {/* STATUS SIMPAN */}
          {canManage && saved && (
            <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700">
              ✓ Rekap IPK & pemasukan Kas berhasil disimpan
            </div>
          )}

          {/* BUTTON */}
          {canManage && <button
            type="button"
            onClick={simpanSemua}
            disabled={saving || loading}
            className="mt-5 w-full rounded-2xl bg-slate-900 px-4 py-4 text-base font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Menyimpan..."
              : "Simpan Rekap IPK"}
          </button>}

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
