"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { wilayah } from "@/lib/wilayah/data";

type FormData = {
  jenisSurat: string;
  nik: string;
  nama: string;
  noKK: string;
  alamat: string;
  rt: string;
  keperluan: string;
};

export default function BuatSuratPage() {
  const [formData, setFormData] = useState<FormData>({
    jenisSurat: "",
    nik: "",
    nama: "",
    noKK: "",
    alamat: "",
    rt: "",
    keperluan: "",
  });

  const [loading, setLoading] = useState(false);
  const [cekNikLoading, setCekNikLoading] = useState(false);
  const [pesan, setPesan] = useState("");
  const [statusNik, setStatusNik] = useState<
    "kosong" | "ditemukan" | "belum"
  >("kosong");

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

    if (name === "nik") {
      setStatusNik("kosong");
      setPesan("");
    }
  }

  async function cekNik() {
    const nik = formData.nik.trim();

    if (!nik) {
      setPesan("Masukkan NIK terlebih dahulu.");
      setStatusNik("kosong");
      return;
    }

    if (nik.length !== 16) {
      setPesan("NIK harus terdiri dari 16 digit.");
      setStatusNik("kosong");
      return;
    }

    setCekNikLoading(true);
    setPesan("");

    try {
      const { data, error } = await supabase
        .from("warga")
        .select("id, nik, no_kk, nama, alamat, rt")
        .eq("nik", nik)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setFormData((prev) => ({
          ...prev,
          nik: data.nik,
          nama: data.nama || "",
          noKK: data.no_kk || "",
          alamat: data.alamat || "",
          rt: data.rt || "",
        }));

        setStatusNik("ditemukan");
        setPesan(
          `Warga ditemukan: ${data.nama}. Data warga otomatis diisi.`
        );
      } else {
        setStatusNik("belum");
        setPesan(
          "NIK belum terdaftar. Silakan lengkapi data warga di bawah."
        );
      }
    } catch (error) {
      console.error("Gagal mengecek NIK:", error);

      if (error && typeof error === "object") {
        const err = error as {
          message?: string;
          code?: string;
        };

        setPesan(
          `Gagal mengecek NIK: ${
            err.message || "Tidak diketahui"
          }${err.code ? ` | CODE: ${err.code}` : ""}`
        );
      } else {
        setPesan(`Gagal mengecek NIK: ${String(error)}`);
      }

      setStatusNik("kosong");
    } finally {
      setCekNikLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setPesan("");

    try {
      if (formData.nik.trim().length !== 16) {
        throw new Error("NIK harus terdiri dari 16 digit.");
      }

      // 1. Cari warga berdasarkan NIK
      const { data: wargaLama, error: cariError } = await supabase
        .from("warga")
        .select("id")
        .eq("nik", formData.nik.trim())
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
            nik: formData.nik.trim(),
            no_kk: formData.noKK.trim() || null,
            nama: formData.nama.trim(),
            alamat: formData.alamat.trim(),
            rt: formData.rt,
          })
          .select("id")
          .single();

        if (wargaError) {
          throw wargaError;
        }

        wargaId = wargaBaru.id;
      }

      // 3. Buat surat sebagai DRAFT
      const { error: suratError } = await supabase.from("surat").insert({
        warga_id: wargaId,
        jenis_surat: formData.jenisSurat,
        keperluan: formData.keperluan.trim(),
        rt: formData.rt,
        rw: "16",
        status: "DRAFT",
      });

      if (suratError) {
        throw suratError;
      }

      // 4. Berhasil
      setPesan(
        "Surat berhasil dibuat dan disimpan sebagai DRAFT."
      );

      setFormData({
        jenisSurat: "",
        nik: "",
        nama: "",
        noKK: "",
        alamat: "",
        rt: "",
        keperluan: "",
      });

      setStatusNik("kosong");
    } catch (error) {
      console.error("Gagal menyimpan surat:", error);

      if (error && typeof error === "object") {
        const err = error as {
          message?: string;
          code?: string;
          details?: string;
          hint?: string;
        };

        setPesan(
          `Gagal menyimpan surat: ${
            err.message || "Tidak diketahui"
          }${err.code ? ` | CODE: ${err.code}` : ""}${
            err.details ? ` | DETAIL: ${err.details}` : ""
          }${err.hint ? ` | HINT: ${err.hint}` : ""}`
        );
      } else {
        setPesan(`Gagal menyimpan surat: ${String(error)}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 pb-10">
      {/* HEADER */}
      <header className="bg-blue-700 px-5 py-6 text-white">
        <div className="mx-auto max-w-xl">
          <p className="text-sm text-blue-100">
            Sistem Administrasi RW 16
          </p>

          <h1 className="mt-1 text-2xl font-bold">
            Buat Surat
          </h1>

          <p className="mt-1 text-sm text-blue-100">
            Buat surat warga dan simpan sebagai draft
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* JENIS SURAT */}
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-base font-bold text-gray-800">
                Jenis Surat
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Pilih jenis surat yang akan dibuat.
              </p>
            </div>

            <select
              id="jenisSurat"
              name="jenisSurat"
              value={formData.jenisSurat}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-700 outline-none transition focus:border-blue-600"
            >
              <option value="">Pilih jenis surat</option>

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
          </section>

          {/* DATA WARGA */}
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-base font-bold text-gray-800">
                Data Warga
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Masukkan NIK untuk mengambil data warga yang sudah terdaftar.
              </p>
            </div>

            <div className="space-y-4">
              {/* NIK */}
              <div>
                <label
                  htmlFor="nik"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  NIK
                </label>

                <div className="flex gap-2">
                  <input
                    id="nik"
                    name="nik"
                    type="text"
                    inputMode="numeric"
                    maxLength={16}
                    placeholder="16 digit NIK"
                    value={formData.nik}
                    onChange={handleChange}
                    required
                    className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-600"
                  />

                  <button
                    type="button"
                    onClick={cekNik}
                    disabled={cekNikLoading}
                    className="shrink-0 rounded-xl bg-gray-800 px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {cekNikLoading ? "CEK..." : "CEK NIK"}
                  </button>
                </div>

                {statusNik === "ditemukan" && (
                  <div className="mt-2 rounded-xl bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                    ✓ Warga terdaftar. Data otomatis terisi.
                  </div>
                )}

                {statusNik === "belum" && (
                  <div className="mt-2 rounded-xl bg-yellow-50 px-3 py-2 text-xs font-semibold text-yellow-700">
                    NIK belum terdaftar. Lengkapi data warga di bawah.
                  </div>
                )}
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
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-600"
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
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-600"
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
                  className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-600"
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
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-700 outline-none transition focus:border-blue-600"
                >
                  <option value="">Pilih RT</option>

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
          </section>

          {/* KEPERLUAN */}
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-base font-bold text-gray-800">
                Keperluan Surat
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Jelaskan tujuan atau keperluan pembuatan surat.
              </p>
            </div>

            <textarea
              id="keperluan"
              name="keperluan"
              rows={5}
              placeholder="Contoh: Untuk keperluan administrasi..."
              value={formData.keperluan}
              onChange={handleChange}
              required
              className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-600"
            />
          </section>

          {/* PESAN */}
          {pesan && (
            <div
              className={
                "rounded-2xl p-4 text-sm font-semibold shadow-sm " +
                (pesan.toLowerCase().includes("berhasil") ||
                pesan.toLowerCase().includes("ditemukan")
                  ? "bg-green-50 text-green-700"
                  : pesan.toLowerCase().includes("belum terdaftar")
                  ? "bg-yellow-50 text-yellow-700"
                  : "bg-red-50 text-red-700")
              }
            >
              {pesan}
            </div>
          )}

          {/* STATUS DRAFT */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
              Status setelah disimpan
            </p>

            <p className="mt-1 text-sm font-semibold text-blue-900">
              DRAFT
            </p>

            <p className="mt-1 text-xs leading-5 text-blue-700">
              Surat belum resmi dan belum dikirim ke RW. Tahap approval,
              tanda tangan, dan penerbitan PDF akan kita tambahkan berikutnya.
            </p>
          </div>

          {/* TOMBOL */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-blue-700 px-5 py-4 text-base font-bold text-white shadow-sm transition hover:bg-blue-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "MENYIMPAN DRAFT..." : "SIMPAN SEBAGAI DRAFT"}
          </button>
        </form>
      </div>
    </main>
  );
}