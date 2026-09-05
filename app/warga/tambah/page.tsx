"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Kategori = {
  id: number;
  nama: string;
};

export default function TambahWargaPage() {
  const router = useRouter();

  const [nik, setNik] = useState("");
  const [noKk, setNoKk] = useState("");
  const [nama, setNama] = useState("");
  const [alamat, setAlamat] = useState("");
  const [rt, setRt] = useState("01");
  const [jenisKelamin, setJenisKelamin] = useState("");
  const [tempatLahir, setTempatLahir] = useState("");
  const [tanggalLahir, setTanggalLahir] = useState("");
  const [agama, setAgama] = useState("");
  const [statusPerkawinan, setStatusPerkawinan] = useState("");
  const [noHp, setNoHp] = useState("");
  const [pendidikan, setPendidikan] = useState("");
  const [pekerjaan, setPekerjaan] = useState("");
  const [statusTinggal, setStatusTinggal] = useState("Tetap");

  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [kategoriDipilih, setKategoriDipilih] = useState<number[]>([]);

  const [loading, setLoading] = useState(false);
  const [memuatKategori, setMemuatKategori] = useState(true);
  const [pesan, setPesan] = useState("");

  useEffect(() => {
    ambilKategori();
  }, []);

  async function ambilKategori() {
    setMemuatKategori(true);

    const { data, error } = await supabase
      .from("kategori_warga")
      .select("id, nama")
      .order("nama", { ascending: true });

    if (error) {
      console.error("Gagal mengambil kategori:", error);
      setPesan(
        "Gagal mengambil kategori: " + error.message
      );
      setMemuatKategori(false);
      return;
    }

    setKategori(data || []);
    setMemuatKategori(false);
  }

  function toggleKategori(id: number) {
    setKategoriDipilih((sebelumnya) => {
      if (sebelumnya.includes(id)) {
        return sebelumnya.filter(
          (kategoriId) => kategoriId !== id
        );
      }

      return [...sebelumnya, id];
    });
  }

  async function simpanWarga(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setPesan("");

    if (!nik || !nama || !alamat || !rt) {
      setPesan(
        "NIK, nama, alamat, dan RT wajib diisi."
      );
      setLoading(false);
      return;
    }

    const { data: wargaBaru, error: wargaError } =
      await supabase
        .from("warga")
        .insert({
          nik,
          no_kk: noKk || null,
          nama,
          alamat,
          rt,
          jenis_kelamin: jenisKelamin || null,
          tempat_lahir: tempatLahir || null,
          tanggal_lahir: tanggalLahir || null,
          agama: agama || null,
          status_perkawinan:
            statusPerkawinan || null,
          no_hp: noHp || null,
          pendidikan: pendidikan || null,
          pekerjaan: pekerjaan || null,
          status_tinggal:
            statusTinggal || "Tetap",
          status_warga: "Aktif",
        })
        .select("id")
        .single();

    if (wargaError) {
      console.error(
        "Gagal menyimpan warga:",
        wargaError
      );

      if (wargaError.code === "23505") {
        setPesan("NIK tersebut sudah terdaftar.");
      } else {
        setPesan(
          "Gagal menyimpan data warga: " +
            wargaError.message
        );
      }

      setLoading(false);
      return;
    }

    if (
      wargaBaru &&
      kategoriDipilih.length > 0
    ) {
      const dataKategori = kategoriDipilih.map(
        (kategoriId) => ({
          warga_id: wargaBaru.id,
          kategori_id: kategoriId,
        })
      );

      const { error: kategoriError } =
        await supabase
          .from("warga_kategori")
          .insert(dataKategori);

      if (kategoriError) {
        console.error(
          "Gagal menyimpan kategori:",
          kategoriError
        );

        setPesan(
          "Data warga berhasil disimpan, tetapi kategori gagal disimpan: " +
            kategoriError.message
        );

        setLoading(false);
        return;
      }
    }

    router.push("/warga");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-gray-100 pb-10">
      <header className="bg-blue-700 px-5 py-6 text-white">
        <div className="mx-auto max-w-xl">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-4 text-sm text-blue-100"
          >
            ← Kembali
          </button>

          <p className="text-sm text-blue-100">
            Nuansa Indah Ciomas
          </p>

          <h1 className="mt-1 text-2xl font-bold">
            Tambah Warga
          </h1>

          <p className="mt-1 text-sm text-blue-100">
            Tambahkan data warga RW 16
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-5">
        <form
          onSubmit={simpanWarga}
          className="space-y-4"
        >
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800">
              Data Utama
            </h2>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  NIK *
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={16}
                  value={nik}
                  onChange={(e) =>
                    setNik(
                      e.target.value.replace(/\D/g, "")
                    )
                  }
                  placeholder="16 digit NIK"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Nomor KK
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={16}
                  value={noKk}
                  onChange={(e) =>
                    setNoKk(
                      e.target.value.replace(/\D/g, "")
                    )
                  }
                  placeholder="16 digit nomor KK"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Nama Lengkap *
                </label>

                <input
                  type="text"
                  value={nama}
                  onChange={(e) =>
                    setNama(e.target.value)
                  }
                  placeholder="Nama lengkap"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Alamat *
                </label>

                <textarea
                  value={alamat}
                  onChange={(e) =>
                    setAlamat(e.target.value)
                  }
                  placeholder="Alamat lengkap"
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  RT *
                </label>

                <select
                  value={rt}
                  onChange={(e) =>
                    setRt(e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-600"
                >
                  <option value="01">RT 01</option>
                  <option value="02">RT 02</option>
                  <option value="03">RT 03</option>
                  <option value="04">RT 04</option>
                  <option value="05">RT 05</option>
                  <option value="06">RT 06</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800">
              Kategori Warga
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Pilih satu atau beberapa kategori yang sesuai.
            </p>

            {memuatKategori ? (
              <p className="mt-4 text-sm text-gray-500">
                Memuat kategori...
              </p>
            ) : kategori.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">
                Belum ada kategori warga.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {kategori.map((item) => {
                  const dipilih =
                    kategoriDipilih.includes(item.id);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        toggleKategori(item.id)
                      }
                      className={
                        "rounded-xl border px-4 py-3 text-left text-sm font-semibold transition " +
                        (dipilih
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-gray-50 text-gray-600")
                      }
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={
                            "flex h-5 w-5 items-center justify-center rounded border text-xs " +
                            (dipilih
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-gray-300 bg-white")
                          }
                        >
                          {dipilih ? "✓" : ""}
                        </span>

                        <span>{item.nama}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {kategoriDipilih.length > 0 && (
              <p className="mt-4 text-xs text-gray-500">
                {kategoriDipilih.length} kategori dipilih
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800">
              Data Pribadi
            </h2>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Jenis Kelamin
                </label>

                <select
                  value={jenisKelamin}
                  onChange={(e) =>
                    setJenisKelamin(e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-600"
                >
                  <option value="">
                    Pilih jenis kelamin
                  </option>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Tempat Lahir
                </label>

                <input
                  type="text"
                  value={tempatLahir}
                  onChange={(e) =>
                    setTempatLahir(e.target.value)
                  }
                  placeholder="Tempat lahir"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Tanggal Lahir
                </label>

                <input
                  type="date"
                  value={tanggalLahir}
                  onChange={(e) =>
                    setTanggalLahir(e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Agama
                </label>

                <select
                  value={agama}
                  onChange={(e) =>
                    setAgama(e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-600"
                >
                  <option value="">Pilih agama</option>
                  <option value="Islam">Islam</option>
                  <option value="Kristen">Kristen</option>
                  <option value="Katolik">Katolik</option>
                  <option value="Hindu">Hindu</option>
                  <option value="Buddha">Buddha</option>
                  <option value="Konghucu">Konghucu</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Status Perkawinan
                </label>

                <select
                  value={statusPerkawinan}
                  onChange={(e) =>
                    setStatusPerkawinan(e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-600"
                >
                  <option value="">
                    Pilih status perkawinan
                  </option>
                  <option value="Belum Kawin">
                    Belum Kawin
                  </option>
                  <option value="Kawin">Kawin</option>
                  <option value="Cerai Hidup">
                    Cerai Hidup
                  </option>
                  <option value="Cerai Mati">
                    Cerai Mati
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800">
              Data Tambahan
            </h2>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Nomor HP
                </label>

                <input
                  type="tel"
                  value={noHp}
                  onChange={(e) =>
                    setNoHp(e.target.value)
                  }
                  placeholder="08xxxxxxxxxx"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Pendidikan
                </label>

                <input
                  type="text"
                  value={pendidikan}
                  onChange={(e) =>
                    setPendidikan(e.target.value)
                  }
                  placeholder="Contoh: SMA"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Pekerjaan
                </label>

                <input
                  type="text"
                  value={pekerjaan}
                  onChange={(e) =>
                    setPekerjaan(e.target.value)
                  }
                  placeholder="Contoh: Wiraswasta"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Status Tinggal
                </label>

                <select
                  value={statusTinggal}
                  onChange={(e) =>
                    setStatusTinggal(e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-600"
                >
                  <option value="Tetap">Tetap</option>
                  <option value="Kontrak">Kontrak</option>
                  <option value="Kos">Kos</option>
                </select>
              </div>
            </div>
          </div>

          {pesan && (
            <div className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600">
              {pesan}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 px-4 py-4 text-base font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Menyimpan..."
              : "Simpan Data Warga"}
          </button>
        </form>
      </div>
    </main>
  );
}