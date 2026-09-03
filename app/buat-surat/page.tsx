"use client";

"use client";

import { useState } from "react";
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

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    console.log("Data surat:", formData);

    alert("Data surat berhasil disiapkan.");
  }

  return (
    <main className="min-h-screen bg-gray-100 pb-10">
      {/* Header */}
      <header className="bg-blue-700 px-5 py-5 text-white">
        <div className="mx-auto max-w-xl">
          <p className="text-sm text-blue-100">Sistem Administrasi</p>
          <h1 className="text-2xl font-bold">Buat Surat</h1>
          <p className="mt-1 text-sm text-blue-100">
            Isi data warga untuk membuat surat
          </p>
        </div>
      </header>

      {/* Form */}
      <div className="mx-auto max-w-xl px-4 py-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Jenis Surat */}
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
              <option value="">Pilih jenis surat</option>
              <option value="surat-pengantar">Surat Pengantar</option>
              <option value="surat-domisili">Surat Domisili</option>
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

          {/* Data Warga */}
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
                  placeholder="Masukkan NIK"
                  value={formData.nik}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
                />
              </div>

              {/* Nama */}
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

              {/* No KK */}
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
                  placeholder="Masukkan nomor KK"
                  value={formData.noKK}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
                />
              </div>

              {/* Alamat */}
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
                  {wilayah.rts.map((rt) => (
  <option key={rt.kode} value={rt.kode}>
    {rt.nama}
  </option>
))}
            
                </select>
              </div>
            </div>
          </div>

          {/* Keperluan */}
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

          {/* Tombol */}
          <button
            type="submit"
            className="w-full rounded-2xl bg-blue-700 px-5 py-4 text-base font-bold text-white shadow-sm transition hover:bg-blue-800 active:scale-[0.98]"
          >
            BUAT SURAT
          </button>
        </form>
      </div>
    </main>
  );
}