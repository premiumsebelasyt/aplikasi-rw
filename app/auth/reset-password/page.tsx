"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError || !data.session) {
        setError("Tautan pemulihan tidak valid atau sudah kedaluwarsa. Minta tautan baru.");
      }
      setReady(true);
    });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setMessage("Password berhasil diganti. Silakan masuk kembali.");
    await supabase.auth.signOut();
    window.setTimeout(() => router.replace("/login"), 1000);
  }

  return (
    <main className="min-h-screen bg-[#f5f7f4] px-4 py-8 text-slate-800 sm:py-12">
      <div className="mx-auto max-w-lg">
        <Link href="/login" className="inline-flex min-h-10 items-center text-sm font-semibold text-emerald-800">← Kembali ke login</Link>
        <section className="mt-5 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-emerald-800">Keamanan akun RW 16</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Buat password baru</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Gunakan password baru minimal 8 karakter.</p>
          {!ready ? <p className="mt-6 text-sm text-slate-500">Memeriksa tautan…</p> : !error && !message ? (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-700">Password baru
                <input autoFocus required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 text-base outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
              </label>
              <button disabled={saving} className="min-h-12 w-full rounded-xl bg-emerald-800 px-4 font-semibold text-white disabled:opacity-60">{saving ? "Menyimpan…" : "Simpan password baru"}</button>
            </form>
          ) : null}
          {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">{error}</p>}
          {message && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}
          {(error || message) && <Link href="/login" className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-emerald-800">Ke halaman login</Link>}
        </section>
      </div>
    </main>
  );
}
