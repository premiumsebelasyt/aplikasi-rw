"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { wilayah } from "@/lib/wilayah/data";

export default function BuatSuratPage() {
  const [formData, setFormData] = useState({
    jenisSurat: "",
    nik: "",
    nama: "",
    noKK: "",
    alamat: "",
    rt: "",
    keperluan: "",
  });

  const [loading, setLoading] = useState(false);
  const [pesan, setPesan] = useState("");

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setPesan("");

    try {
      // 1. Cari warga berdasarkan NIK
      const { data: wargaLama, error: cariError } = await supabase
        .from("warga")
        .select("id")
        .eq("nik", formData.nik)
        .maybeSingle();

      if (cariError) {
        throw cariError;
      }

      let wargaId = wargaLama?.id;

      // 2. Kalau warga belum ada, buat data warga baru
      if (!wargaId) {
        const { data: wargaBaru, error: wargaError } = await supabase
          .from("warga")
          .insert({
            nik: formData.nik,
            no_kk: formData.noKK || null,
            nama: formData.nama,
            alamat: formData.alamat,
            rt: formData.rt,
          })
          .select("id")
          .single();

        if (wargaError) {
          throw wargaError;
        }

        wargaId = wargaBaru.id;
      }

      // 3. Buat surat
      const { error: suratError } = await supabase
        .from("surat")
        .insert({
          warga_id: wargaId,
          jenis_surat: formData.jenisSurat,
          keperluan: formData.keperluan,
          rt: formData.rt,
          rw: "16",
          status: "DRAFT",
        });

      if (suratError) {
        throw suratError;
      }

      // Berhasil
      setPesan("Data surat berhasil disimpan.");

      setFormData({
        jenisSurat: "",
        nik: "",
        nama: "",
        noKK: "",
        alamat: "",
        rt: "",
        keperluan: "",
      });
    } catch (error) {
      console.error("Gagal menyimpan surat:", error);

      // Tampilkan error asli dari Supabase
      if (error && typeof error === "object") {
        const err = error as {
          message?: string;
          code?: string;
          details?: string;
          hint?: string;
        };

        setPesan(
          `ERROR: ${err.message || "Tidak diketahui"}${
            err.code ? ` | CODE: ${err.code}` : ""
          }${err.details ? ` | DETAIL: ${err.details}` : ""}${
            err.hint ? ` | HINT: ${err.hint}` : ""
          }`
        );
      } else {
        setPesan(`ERROR: ${String(error)}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 pb-10">
      {/* HEADER */}
      <header className="bg-blue-700 px-5 py-5 text-white">
        <div className="mx-auto max-w-xl">
          <p className="text-sm text-blue-100">
            Sistem Administrasi
          </p>

          <h1 className="text-2xl font-bold">
            Buat Surat
          </h1>

          <p className="mt-1 text-sm text-blue-100">
            Isi data warga untuk membuat surat
          </p>
        </div>
      </header>

      {/* FORM */}
      <div className="mx-auto max-w-xl px-4 py-5">
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* JENIS SURAT */}
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <label
              htmlFor="jenisSurat"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Jenis Surat
            </label>

            <select
              id="jenisSurat"
              name="jenisSurat"
              value={formData.jenisSurat}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-700 outline-none focus:border-blue-600"
            >
              <option value="">
                Pilih jenis surat
              </option>

              <option value="surat-pengantar">
                Surat Pengantar
              </option>

              <option value="surat-domisili">
                Surat Domisili
              </option>

              <option value="surat-keterangan-usaha">
                Surat Keterangan Usaha
              </option>

              <option value="surat-keterangan-tidak-mampu">
                Surat Keterangan Tidak Mampu
              </option>

              <option value="surat-keterangan-lainnya">
                Surat Keterangan Lainnya
              </option>
            </select>
          </div>

          {/* DATA WARGA */}
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-base font-bold text-gray-800">
              Data Warga
            </h2>

            <div className="space-y-4">

              {/* NIK */}
              <div>
                <label
                  htmlFor="nik"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  NIK
                </label>

                <input
                  id="nik"
                  name="nik"
                  type="text"
                  inputMode="numeric"
                  maxLength={16}
                  placeholder="Masukkan NIK"
                  value={formData.nik}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
                />
              </div>

              {/* NAMA */}
              <div>
                <label
                  htmlFor="nama"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Nama Lengkap
                </label>

                <input
                  id="nama"
                  name="nama"
                  type="text"
                  placeholder="Masukkan nama lengkap"
                  value={formData.nama}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
                />
              </div>

              {/* NO KK */}
              <div>
                <label
                  htmlFor="noKK"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Nomor KK
                </label>

                <input
                  id="noKK"
                  name="noKK"
                  type="text"
                  inputMode="numeric"
                  maxLength={16}
                  placeholder="Masukkan nomor KK"
                  value={formData.noKK}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
                />
              </div>

              {/* ALAMAT */}
              <div>
                <label
                  htmlFor="alamat"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Alamat
                </label>

                <textarea
                  id="alamat"
                  name="alamat"
                  rows={3}
                  placeholder="Masukkan alamat lengkap"
                  value={formData.alamat}
                  onChange={handleChange}
                  required
                  className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
                />
              </div>

              {/* RT */}
              <div>
                <label
                  htmlFor="rt"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  RT
                </label>

                <select
                  id="rt"
                  name="rt"
                  value={formData.rt}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-700 outline-none focus:border-blue-600"
                >
                  <option value="">
                    Pilih RT
                  </option>

                  {wilayah.rts.map((rt) => (
                    <option
                      key={rt.kode}
                      value={rt.kode}
                    >
                      {rt.nama}
                    </option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* KEPERLUAN */}
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <label
              htmlFor="keperluan"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Keperluan
            </label>

            <textarea
              id="keperluan"
              name="keperluan"
              rows={4}
              placeholder="Contoh: Untuk keperluan administrasi..."
              value={formData.keperluan}
              onChange={handleChange}
              required
              className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
            />
          </div>

          {/* PESAN */}
          {pesan && (
            <div className="rounded-xl bg-white p-4 text-sm font-semibold text-gray-700 shadow-sm">
              {pesan}
            </div>
          )}

          {/* TOMBOL */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-blue-700 px-5 py-4 text-base font-bold text-white shadow-sm transition hover:bg-blue-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "MENYIMPAN..." : "BUAT SURAT"}
          </button>

        </form>
      </div>
    </main>
  );
}