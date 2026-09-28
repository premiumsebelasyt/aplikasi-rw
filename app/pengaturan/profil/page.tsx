"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import { getCachedVerifiedProfile, getVerifiedCurrentProfile, updateCachedProfile } from "@/lib/auth/current-profile";

export default function ProfilPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(() => !getCachedVerifiedProfile());
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState(() => getCachedVerifiedProfile()?.user.email ?? "");
  const [nama, setNama] = useState(() => getCachedVerifiedProfile()?.profile.nama_lengkap ?? getCachedVerifiedProfile()?.profile.nama ?? "");
  const [nik, setNik] = useState(() => getCachedVerifiedProfile()?.profile.nik ?? "");
  const [noHp, setNoHp] = useState(() => getCachedVerifiedProfile()?.profile.no_hp ?? "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      const current = await getVerifiedCurrentProfile();
      if (!active) return;
      if (!current) {
        router.replace("/login");
        return;
      }
      setEmail(current.user.email ?? "");
      setNama(current.profile.nama_lengkap ?? current.profile.nama ?? "");
      setNik(current.profile.nik ?? "");
      setNoHp(current.profile.no_hp ?? "");
      setLoading(false);
    }
    void loadProfile();
    return () => { active = false; };
  }, [router]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setSaving(false);
      router.replace("/login");
      return;
    }

    const { data: savedProfile, error: profileError } = await supabase
      .from("profiles")
      .update({ nama: nama.trim(), nama_lengkap: nama.trim(), nik: nik.trim(), no_hp: noHp.trim() })
      .eq("id", userData.user.id)
      .select("id")
      .maybeSingle();
    if (profileError || !savedProfile) {
      setSaving(false);
      setError(profileError?.message ?? "Profil belum tersedia atau akses belum diizinkan.");
      return;
    }
    updateCachedProfile({ nama: nama.trim(), nama_lengkap: nama.trim(), nik: nik.trim(), no_hp: noHp.trim() });

    if (password) {
      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) {
        setSaving(false);
        setError(`Profil tersimpan, tetapi password gagal diperbarui: ${passwordError.message}`);
        return;
      }
    }
    setSaving(false);
    setPassword("");
    setMessage(password ? "Profil dan password berhasil diperbarui." : "Profil berhasil diperbarui.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <main className="min-h-screen bg-[#f5f7f4] px-4 py-8 text-slate-800 sm:py-12">
      <div className="mx-auto max-w-lg">
        <Link href="/pengaturan" className="inline-flex min-h-10 items-center text-sm font-semibold text-emerald-800">← Kembali ke Pengaturan</Link>
        <section className="mt-5 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-emerald-800">Akun RW 16</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Profil & keamanan</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Lengkapi identitas yang ditampilkan pada administrasi warga. Role akses dikelola administrator.</p>

          {loading ? <p className="mt-6 text-sm text-slate-500">Memuat profil…</p> : (
            <form onSubmit={saveProfile} className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-700">Nama lengkap
                <input required autoComplete="name" value={nama} onChange={(event) => setNama(event.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 text-base outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
              </label>
              <label className="block text-sm font-medium text-slate-700">NIK
                <input required inputMode="numeric" minLength={16} maxLength={16} pattern="[0-9]{16}" value={nik} onChange={(event) => setNik(event.target.value)} placeholder="16 digit NIK" className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 text-base outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
              </label>
              <label className="block text-sm font-medium text-slate-700">Nomor HP
                <input required type="tel" autoComplete="tel" value={noHp} onChange={(event) => setNoHp(event.target.value)} placeholder="08xxxxxxxxxx" className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 text-base outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
              </label>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-700">Email akun</p>
                <p className="mt-1 break-all text-sm text-slate-600">{email || "-"}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Email digunakan untuk verifikasi dan pemulihan akun.</p>
              </div>
              <label className="block text-sm font-medium text-slate-700">Password baru <span className="font-normal text-slate-500">(opsional)</span>
                <input type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Kosongkan jika tidak diganti" className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 text-base outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
              </label>
              {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">Gagal menyimpan: {error}</p>}
              {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}
              <button disabled={saving} className="min-h-12 w-full rounded-xl bg-emerald-800 px-4 font-semibold text-white transition hover:bg-emerald-900 disabled:opacity-60">{saving ? "Menyimpan…" : "Simpan perubahan"}</button>
              <button type="button" onClick={signOut} className="min-h-11 w-full rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Keluar dari akun</button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
