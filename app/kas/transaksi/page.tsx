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
  kas_ipk_id: number | null;
};

type FormEdit = {
  jenis: "PEMASUKAN" | "PENGELUARAN";
  tanggal: string;
  kategori_id: string;
  keterangan: string;
  nominal: string;
  rt: string;
  sumber: string;
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

function formatBulan(value: string) {
  return new Date(value + "-01").toLocaleDateString(
    "id-ID",
    {
      month: "long",
      year: "numeric",
    }
  );
}

export default function TransaksiKasPage() {
  const [bulan, setBulan] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [jenisFilter, setJenisFilter] = useState<
    "SEMUA" | "PEMASUKAN" | "PENGELUARAN"
  >("SEMUA");

  const [search, setSearch] = useState("");

  const [transaksi, setTransaksi] = useState<
    Transaksi[]
  >([]);

  const [kategori, setKategori] = useState<
    Kategori[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [editItem, setEditItem] =
    useState<Transaksi | null>(null);

  const [formEdit, setFormEdit] =
    useState<FormEdit | null>(null);

  const [savingEdit, setSavingEdit] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

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

    const [transaksiRes, kategoriRes] =
      await Promise.all([
        supabase
          .from("kas_transaksi")
          .select(
            "id, tanggal, jenis, kategori_id, keterangan, nominal, rt, sumber, penerima, kas_ipk_id"
          )
          .gte("tanggal", awalBulan)
          .lte("tanggal", akhirBulan)
          .order("tanggal", {
            ascending: false,
          })
          .order("id", {
            ascending: false,
          }),

        supabase
          .from("kas_kategori")
          .select("id, nama, jenis")
          .eq("aktif", true)
          .order("nama"),
      ]);

    if (transaksiRes.error) {
      console.error(transaksiRes.error);
      alert(
        `Gagal mengambil transaksi: ${transaksiRes.error.message}`
      );
      setLoading(false);
      return;
    }

    if (kategoriRes.error) {
      console.error(kategoriRes.error);
      alert(
        `Gagal mengambil kategori: ${kategoriRes.error.message}`
      );
      setLoading(false);
      return;
    }

    setTransaksi(
      (transaksiRes.data || []).map((item) => ({
        ...item,
        nominal: Number(item.nominal || 0),
        kas_ipk_id: item.kas_ipk_id
          ? Number(item.kas_ipk_id)
          : null,
      }))
    );

    setKategori(kategoriRes.data || []);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [bulan]);

  const transaksiFiltered = useMemo(() => {
    const kata = search.trim().toLowerCase();

    return transaksi.filter((item) => {
      const cocokJenis =
        jenisFilter === "SEMUA" ||
        item.jenis === jenisFilter;

      if (!cocokJenis) return false;

      if (!kata) return true;

      const namaKategori =
        kategori.find(
          (kat) => kat.id === item.kategori_id
        )?.nama || "";

      const teks = [
        item.keterangan,
        item.rt || "",
        item.sumber || "",
        item.penerima || "",
        namaKategori,
      ]
        .join(" ")
        .toLowerCase();

      return teks.includes(kata);
    });
  }, [
    transaksi,
    kategori,
    jenisFilter,
    search,
  ]);

  const totalPemasukan = transaksiFiltered
    .filter(
      (item) => item.jenis === "PEMASUKAN"
    )
    .reduce(
      (total, item) => total + item.nominal,
      0
    );

  const totalPengeluaran = transaksiFiltered
    .filter(
      (item) => item.jenis === "PENGELUARAN"
    )
    .reduce(
      (total, item) => total + item.nominal,
      0
    );

  function mulaiEdit(item: Transaksi) {
    if (item.kas_ipk_id) {
      alert(
        "Transaksi IPK otomatis tidak dapat diedit dari menu ini.\n\nUbah nominalnya melalui menu IPK Warga."
      );
      return;
    }

    setEditItem(item);

    setFormEdit({
      jenis: item.jenis,
      tanggal: item.tanggal,
      kategori_id: item.kategori_id
        ? String(item.kategori_id)
        : "",
      keterangan: item.keterangan,
      nominal: String(
        Math.round(item.nominal)
      ),
      rt: item.rt || "",
      sumber:
        item.jenis === "PEMASUKAN"
          ? item.sumber || ""
          : item.penerima || "",
    });
  }

  function tutupEdit() {
    if (savingEdit) return;

    setEditItem(null);
    setFormEdit(null);
  }

  async function simpanEdit() {
    if (!editItem || !formEdit) return;

    const keterangan =
      formEdit.keterangan.trim();

    const nominal =
      Number(
        formEdit.nominal.replace(/\D/g, "")
      ) || 0;

    if (!formEdit.tanggal) {
      alert("Tanggal wajib diisi.");
      return;
    }

    if (!keterangan) {
      alert("Keterangan wajib diisi.");
      return;
    }

    if (nominal <= 0) {
      alert("Nominal harus lebih dari 0.");
      return;
    }

    if (!formEdit.kategori_id) {
      alert("Kategori wajib dipilih.");
      return;
    }

    setSavingEdit(true);

    try {
      const { data: transaksiLama, error: cekError } =
        await supabase
          .from("kas_transaksi")
          .select("kas_ipk_id")
          .eq("id", editItem.id)
          .single();

      if (cekError) {
        throw new Error(
          `Gagal memeriksa transaksi: ${cekError.message}`
        );
      }

      if (transaksiLama?.kas_ipk_id) {
        throw new Error(
          "Transaksi IPK otomatis tidak dapat diedit dari menu Transaksi. Ubah nominalnya melalui menu IPK Warga."
        );
      }

      const kategoriTerpilih =
        kategori.find(
          (item) =>
            item.id ===
            Number(formEdit.kategori_id)
        );

      if (
        !kategoriTerpilih ||
        kategoriTerpilih.jenis !==
          formEdit.jenis
      ) {
        throw new Error(
          "Kategori tidak sesuai dengan jenis transaksi."
        );
      }

      const payload = {
        tanggal: formEdit.tanggal,
        jenis: formEdit.jenis,
        kategori_id: Number(
          formEdit.kategori_id
        ),
        keterangan,
        nominal,
        rt: formEdit.rt || null,
        sumber:
          formEdit.jenis === "PEMASUKAN"
            ? formEdit.sumber.trim() || null
            : null,
        penerima:
          formEdit.jenis === "PENGELUARAN"
            ? formEdit.sumber.trim() || null
            : null,
      };

      const { error } = await supabase
        .from("kas_transaksi")
        .update(payload)
        .eq("id", editItem.id);

      if (error) {
        throw new Error(
          `Gagal menyimpan perubahan: ${error.message}`
        );
      }

      setTransaksi((sebelumnya) =>
        sebelumnya.map((item) =>
          item.id === editItem.id
            ? {
                ...item,
                ...payload,
              }
            : item
        )
      );

      tutupEdit();

      alert(
        "Transaksi berhasil diperbarui."
      );
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui transaksi."
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function hapusTransaksi(
    item: Transaksi
  ) {
    if (deletingId !== null) return;

    if (item.kas_ipk_id) {
      alert(
        "Transaksi IPK otomatis tidak dapat dihapus dari menu ini.\n\nUbah nominalnya melalui menu IPK Warga."
      );
      return;
    }

    const yakin = window.confirm(
      `Hapus transaksi berikut?\n\n${item.keterangan}\n${formatRupiah(
        item.nominal
      )}\n\nData yang dihapus tidak dapat dikembalikan.`
    );

    if (!yakin) return;

    setDeletingId(item.id);

    try {
      const {
        data: transaksiLama,
        error: cekError,
      } = await supabase
        .from("kas_transaksi")
        .select("kas_ipk_id")
        .eq("id", item.id)
        .single();

      if (cekError) {
        throw new Error(
          `Gagal memeriksa transaksi: ${cekError.message}`
        );
      }

      if (transaksiLama?.kas_ipk_id) {
        throw new Error(
          "Transaksi IPK otomatis tidak dapat dihapus dari menu Transaksi."
        );
      }

      const { error } = await supabase
        .from("kas_transaksi")
        .delete()
        .eq("id", item.id);

      if (error) {
        throw new Error(
          `Gagal menghapus transaksi: ${error.message}`
        );
      }

      setTransaksi((sebelumnya) =>
        sebelumnya.filter(
          (transaksi) =>
            transaksi.id !== item.id
        )
      );

      alert(
        "Transaksi berhasil dihapus."
      );
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Gagal menghapus transaksi."
      );
    } finally {
      setDeletingId(null);
    }
  }

  function ubahNominal(value: string) {
    if (!formEdit) return;

    const angka = value.replace(
      /\D/g,
      ""
    );

    setFormEdit({
      ...formEdit,
      nominal: angka
        ? Number(angka).toLocaleString(
            "id-ID"
          )
        : "",
    });
  }

  const kategoriEdit = formEdit
    ? kategori.filter(
        (item) =>
          item.jenis === formEdit.jenis
      )
    : [];

  return (
    <main className="min-h-screen bg-slate-100 pb-24">
      <div className="mx-auto max-w-5xl px-4 py-5">

        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Kas RW 16
            </p>

            <h1 className="text-2xl font-bold text-slate-900">
              Transaksi Kas
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Riwayat pemasukan dan pengeluaran.
            </p>
          </div>

          <Link
            href="/kas"
            className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200"
          >
            ← Kas
          </Link>
        </div>

        <section className="mb-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">

          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Periode
          </label>

          <input
            type="month"
            value={bulan}
            onChange={(e) =>
              setBulan(e.target.value)
            }
            className="h-12 w-full rounded-xl border border-slate-300 px-3 text-slate-800 outline-none sm:max-w-xs"
          />

          <p className="mt-2 text-xs text-slate-500">
            {formatBulan(bulan)}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">

            <button
              type="button"
              onClick={() =>
                setJenisFilter("SEMUA")
              }
              className={`rounded-xl px-3 py-3 text-xs font-bold ${
                jenisFilter === "SEMUA"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              Semua
            </button>

            <button
              type="button"
              onClick={() =>
                setJenisFilter("PEMASUKAN")
              }
              className={`rounded-xl px-3 py-3 text-xs font-bold ${
                jenisFilter ===
                "PEMASUKAN"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              Pemasukan
            </button>

            <button
              type="button"
              onClick={() =>
                setJenisFilter("PENGELUARAN")
              }
              className={`rounded-xl px-3 py-3 text-xs font-bold ${
                jenisFilter ===
                "PENGELUARAN"
                  ? "bg-red-600 text-white"
                  : "bg-red-50 text-red-700"
              }`}
            >
              Pengeluaran
            </button>

          </div>

          <div className="mt-4">
            <input
              type="search"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Cari keterangan, kategori, RT..."
              className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm text-slate-800 outline-none focus:border-slate-500"
            />
          </div>

        </section>

        <section className="mb-5 grid grid-cols-2 gap-3">

          <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
            <p className="text-xs font-semibold text-emerald-700">
              Pemasukan
            </p>

            <p className="mt-1 text-lg font-bold text-emerald-700">
              {formatRupiah(
                totalPemasukan
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-red-50 p-4 ring-1 ring-red-100">
            <p className="text-xs font-semibold text-red-700">
              Pengeluaran
            </p>

            <p className="mt-1 text-lg font-bold text-red-700">
              {formatRupiah(
                totalPengeluaran
              )}
            </p>
          </div>

        </section>

        <section className="mb-5">

          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900">
                Daftar Transaksi
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {transaksiFiltered.length} transaksi
              </p>
            </div>

            <div className="flex gap-2">
              <Link
                href="/kas/tambah?pemasukan=1"
                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
              >
                + Masuk
              </Link>

              <Link
                href="/kas/tambah?pengeluaran=1"
                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white"
              >
                + Keluar
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
              Memuat transaksi...
            </div>
          ) : transaksiFiltered.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
              Tidak ada transaksi yang sesuai.
            </div>
          ) : (
            <div className="space-y-3">

              {transaksiFiltered.map(
                (item) => {
                  const namaKategori =
                    kategori.find(
                      (kat) =>
                        kat.id ===
                        item.kategori_id
                    )?.nama ||
                    "Tanpa kategori";

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <span
                              className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                                item.jenis ===
                                "PEMASUKAN"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {item.jenis}
                            </span>

                            {item.kas_ipk_id ? (
                              <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-700">
                                IPK OTOMATIS
                              </span>
                            ) : null}

                            <span className="text-xs text-slate-400">
                              {formatTanggal(
                                item.tanggal
                              )}
                            </span>

                          </div>

                          <p className="mt-2 break-words text-sm font-bold text-slate-900">
                            {item.keterangan}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {namaKategori}
                            {item.rt
                              ? ` • RT ${item.rt}`
                              : ""}
                          </p>

                          {item.jenis ===
                            "PEMASUKAN" &&
                          item.sumber ? (
                            <p className="mt-1 text-xs text-slate-400">
                              Sumber:{" "}
                              {item.sumber}
                            </p>
                          ) : null}

                          {item.jenis ===
                            "PENGELUARAN" &&
                          item.penerima ? (
                            <p className="mt-1 text-xs text-slate-400">
                              Penerima:{" "}
                              {item.penerima}
                            </p>
                          ) : null}

                        </div>

                        <p
                          className={`shrink-0 text-sm font-bold ${
                            item.jenis ===
                            "PEMASUKAN"
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {item.jenis ===
                          "PEMASUKAN"
                            ? "+"
                            : "−"}{" "}
                          {formatRupiah(
                            item.nominal
                          )}
                        </p>

                      </div>

                      {!item.kas_ipk_id ? (
                        <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">

                          <button
                            type="button"
                            onClick={() =>
                              mulaiEdit(
                                item
                              )
                            }
                            className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              hapusTransaksi(
                                item
                              )
                            }
                            disabled={
                              deletingId ===
                              item.id
                            }
                            className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId ===
                            item.id
                              ? "Menghapus..."
                              : "Hapus"}
                          </button>

                        </div>
                      ) : (
                        <p className="mt-3 border-t border-slate-100 pt-3 text-[10px] font-semibold text-slate-400">
                          Transaksi ini dikelola dari menu IPK Warga.
                        </p>
                      )}

                    </div>
                  );
                }
              )}

            </div>
          )}

        </section>

      </div>

      {editItem && formEdit ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">

          <div className="mx-auto my-6 max-w-lg rounded-3xl bg-white p-5 shadow-2xl">

            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Edit Transaksi
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Ubah Data Kas
                </h2>
              </div>

              <button
                type="button"
                onClick={tutupEdit}
                disabled={savingEdit}
                className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Jenis
                </label>

                <select
                  value={formEdit.jenis}
                  onChange={(e) =>
                    setFormEdit({
                      ...formEdit,
                      jenis:
                        e.target.value as
                          | "PEMASUKAN"
                          | "PENGELUARAN",
                      kategori_id: "",
                    })
                  }
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none"
                >
                  <option value="PEMASUKAN">
                    PEMASUKAN
                  </option>

                  <option value="PENGELUARAN">
                    PENGELUARAN
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Tanggal
                </label>

                <input
                  type="date"
                  value={formEdit.tanggal}
                  onChange={(e) =>
                    setFormEdit({
                      ...formEdit,
                      tanggal:
                        e.target.value,
                    })
                  }
                  className="h-12 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Kategori
                </label>

                <select
                  value={
                    formEdit.kategori_id
                  }
                  onChange={(e) =>
                    setFormEdit({
                      ...formEdit,
                      kategori_id:
                        e.target.value,
                    })
                  }
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none"
                >
                  <option value="">
                    Pilih kategori
                  </option>

                  {kategoriEdit.map(
                    (item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.nama}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Keterangan
                </label>

                <textarea
                  value={
                    formEdit.keterangan
                  }
                  onChange={(e) =>
                    setFormEdit({
                      ...formEdit,
                      keterangan:
                        e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Nominal
                </label>

                <div className="overflow-hidden rounded-xl border border-slate-300">
                  <div className="flex items-center">
                    <span className="flex h-12 items-center border-r border-slate-200 bg-slate-100 px-4 text-sm font-bold text-slate-500">
                      Rp
                    </span>

                    <input
                      type="text"
                      inputMode="numeric"
                      value={
                        formEdit.nominal
                      }
                      onChange={(e) =>
                        ubahNominal(
                          e.target.value
                        )
                      }
                      className="h-12 w-full px-4 text-right text-lg font-semibold outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  RT
                </label>

                <select
                  value={formEdit.rt}
                  onChange={(e) =>
                    setFormEdit({
                      ...formEdit,
                      rt: e.target.value,
                    })
                  }
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none"
                >
                  <option value="">
                    Tidak terkait RT tertentu
                  </option>

                  {RT_LIST.map((rt) => (
                    <option
                      key={rt}
                      value={rt}
                    >
                      RT {rt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {formEdit.jenis ===
                  "PEMASUKAN"
                    ? "Sumber Pemasukan"
                    : "Penerima"}
                </label>

                <input
                  type="text"
                  value={formEdit.sumber}
                  onChange={(e) =>
                    setFormEdit({
                      ...formEdit,
                      sumber:
                        e.target.value,
                    })
                  }
                  placeholder={
                    formEdit.jenis ===
                    "PEMASUKAN"
                      ? "Contoh: Sumbangan warga"
                      : "Contoh: Toko bangunan"
                  }
                  className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none"
                />
              </div>

            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">

              <button
                type="button"
                onClick={tutupEdit}
                disabled={savingEdit}
                className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={simpanEdit}
                disabled={savingEdit}
                className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {savingEdit
                  ? "Menyimpan..."
                  : "Simpan Perubahan"}
              </button>

            </div>

          </div>

        </div>
      ) : null}

    </main>
  );
}