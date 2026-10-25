"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/AppShell";

type FormData = {
  jenisSurat: string;
  nik: string;
  nama: string;
  noKK: string;
  alamat: string;
  rt: string;
  keperluan: string;
};

type FamilyMember = {
  id: number;
  nik: string;
  no_kk: string | null;
  nama: string;
  alamat: string | null;
  rt: string;
};

export default function BuatSuratPage() {
  const router = useRouter();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loadingFamily, setLoadingFamily] = useState(true);
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
  const [pesan, setPesan] = useState("");

  useEffect(() => {
    let active = true;
    async function loadFamily() {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !authData.user) {
        router.replace("/login");
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, no_kk")
        .eq("id", authData.user.id)
        .maybeSingle();
      if (!active) return;
      if (profile && profile.role !== "WARGA") {
        router.replace(profile.role === "RT" ? "/rt" : profile.role === "RW" ? "/rw/surat" : profile.role === "BENDAHARA" ? "/kas" : "/login");
        return;
      }
      if (profileError || !profile || !profile.no_kk) {
        setPesan("Akun ini belum memiliki akses pengajuan surat keluarga.");
        setLoadingFamily(false);
        return;
      }
      const { data: members, error: familyError } = await supabase
        .from("warga")
        .select("id, nik, no_kk, nama, alamat, rt")
        .eq("no_kk", profile.no_kk)
        .order("nama", { ascending: true });
      if (!active) return;
      if (familyError) {
        setPesan("Data anggota keluarga belum dapat dimuat.");
      } else {
        setFamilyMembers(members ?? []);
        setFormData((previous) => ({ ...previous, noKK: profile.no_kk }));
        if (!members?.length) setPesan("Belum ada anggota keluarga pada KK ini.");
      }
      setLoadingFamily(false);
    }
    void loadFamily();
    return () => { active = false; };
  }, [router]);

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

    if (name === "nik") setPesan("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setPesan("");

    try {
      if (formData.nik.trim().length !== 16) {
        throw new Error("Pilih anggota keluarga yang akan mengajukan surat.");
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("Sesi berakhir. Silakan login kembali.");
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, no_kk")
        .eq("id", authData.user.id)
        .maybeSingle();
      if (profileError || !profile || profile.role !== "WARGA" || !profile.no_kk) {
        throw new Error("Akun ini tidak memiliki akses pengajuan surat warga.");
      }

      // Resolve the selected person again against the authenticated KK.
      const { data: wargaLama, error: cariError } = await supabase
        .from("warga")
        .select("id, nik, no_kk, nama, alamat, rt")
        .eq("nik", formData.nik.trim())
        .eq("no_kk", profile.no_kk)
        .maybeSingle();

      if (cariError) {
        throw cariError;
      }

      if (!wargaLama) throw new Error("Anggota yang dipilih tidak terhubung ke KK akun ini.");

      const { data: suratBaru, error: suratError } = await supabase.rpc("create_surat_request", {
        p_warga_id: wargaLama.id,
        p_jenis_surat: formData.jenisSurat,
        p_payload: { keperluan: formData.keperluan.trim() },
      });

      if (suratError) {
        throw suratError;
      }

      if (!suratBaru) {
        throw new Error("RPC tidak mengembalikan ID surat; pengajuan tidak dapat dilanjutkan.");
      }

      router.push(`/surat/${suratBaru}`);
    } catch (error) {
      if (error && typeof error === "object") {
        const err = error as { code?: string };
        setPesan(err.code === "42501"
          ? "Akun ini tidak memiliki izin untuk mengajukan surat bagi data tersebut."
          : "Surat gagal disimpan. Periksa data, lalu coba kembali.");
      } else {
        setPesan("Surat gagal disimpan. Periksa data, lalu coba kembali.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] pb-10">
      <PageHeader eyebrow="Nuansa Indah Ciomas · RW 16" title="Buat Surat" subtitle="Buat surat warga dan simpan sebagai draft" />

      <div className="mx-auto max-w-xl px-4 py-5">
        <ol aria-label="Tahapan pengajuan surat" className="mb-4 grid grid-cols-4 rounded-2xl border border-[var(--border)] bg-white px-2 py-3 shadow-sm">
          {["Jenis", "Data", "Cek", "Selesai"].map((step, index) => {
            const activeStep = !formData.jenisSurat ? 0 : !formData.nik ? 1 : !formData.keperluan.trim() ? 2 : 2;
            const active = index <= activeStep;
            return <li key={step} className={`relative flex flex-col items-center gap-1 type-metadata font-medium ${active ? "text-emerald-800" : "text-slate-400"}`}>
              <span className={`grid h-6 w-6 place-items-center rounded-full type-status ${active ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"}`}>{index + 1}</span>
              <span>{step}</span>
            </li>;
          })}
        </ol>
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
                Pilih salah satu anggota yang terhubung ke akun KK ini. Data identitas diambil dari data warga RW.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="nik"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Anggota keluarga
                </label>
                <select aria-label="Anggota keluarga"
                  id="nik"
                  name="nik"
                  value={formData.nik}
                  onChange={(event) => {
                    const member = familyMembers.find((item) => item.nik === event.target.value);
                    setFormData((previous) => ({
                      ...previous,
                      nik: member?.nik ?? "",
                      nama: member?.nama ?? "",
                      noKK: member?.no_kk ?? "",
                      alamat: member?.alamat ?? "",
                      rt: member?.rt ?? "",
                    }));
                  }}
                  disabled={loadingFamily || familyMembers.length === 0}
                  required
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-blue-600 disabled:bg-gray-100"
                >
                  <option value="">{loadingFamily ? "Memuat anggota keluarga…" : "Pilih anggota keluarga"}</option>
                  {familyMembers.map((member) => (
                    <option key={member.id} value={member.nik}>{member.nama} · {member.nik}</option>
                  ))}
                </select>
              </div>

              {/* NAMA */}
              <div>
                <label
                  htmlFor="nama"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Nama Lengkap
                </label>

                <input aria-label="Nama Lengkap"
                  id="nama"
                  name="nama"
                  type="text"
                  placeholder="Terisi dari data warga"
                  value={formData.nama}
                  readOnly
                  required
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none"
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

                <input aria-label="Nomor KK"
                  id="noKK"
                  name="noKK"
                  type="text"
                  inputMode="numeric"
                  maxLength={16}
                  placeholder="Terisi dari akun KK"
                  value={formData.noKK}
                  readOnly
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none"
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

                <textarea aria-label="Alamat"
                  id="alamat"
                  name="alamat"
                  rows={3}
                  placeholder="Terisi dari data warga"
                  value={formData.alamat}
                  readOnly
                  required
                  className="w-full resize-none rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none"
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

                <input aria-label="RT"
                  id="rt"
                  name="rt"
                  type="text"
                  value={formData.rt}
                  readOnly
                  required
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700 outline-none"
                />
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
              Draft dibuat; pengajuan belum dikirim
            </p>

            <p className="mt-1 text-xs leading-5 text-blue-700">
              Setelah draft tersimpan, kirim dari halaman detail agar masuk ke
              antrean RT. Surat mengikuti pemeriksaan RT lalu RW; PDF resmi
              menunggu persetujuan dan tanda tangan yang terdaftar.
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
