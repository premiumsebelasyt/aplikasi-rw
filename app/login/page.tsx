"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";

type AccessRole = "WARGA" | "RT" | "RW" | "BENDAHARA" | "ADMIN";

const homeByRole: Record<AccessRole, string> = {
  WARGA: "/",
  RT: "/rt",
  RW: "/",
  BENDAHARA: "/kas",
  ADMIN: "/menu",
};

function isAccessRole(value: unknown): value is AccessRole {
  return value === "WARGA" || value === "RT" || value === "RW" || value === "BENDAHARA" || value === "ADMIN";
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "register") {
      setMessageIsError(true);
      setMessage("Pendaftaran mandiri belum tersedia. Hubungi pengurus RW untuk verifikasi dan aktivasi akun.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    setMessageIsError(false);
    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: formData.get("identifier"),
          password: formData.get("password"),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessageIsError(true);
        setMessage(typeof result.error === "string" ? result.error : "Username atau password tidak cocok.");
        return;
      }

      const verifiedRole: unknown = result.role;
      if (!isAccessRole(verifiedRole) || !result.session?.access_token || !result.session?.refresh_token) {
        setMessageIsError(true);
        setMessage("Layanan login memberi respons yang tidak valid. Coba lagi.");
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession(result.session);
      if (sessionError) {
        setMessageIsError(true);
        setMessage("Autentikasi diterima, tetapi sesi aplikasi tidak dapat disimpan. Coba lagi.");
        return;
      }

      router.replace(homeByRole[verifiedRole]);
    } catch {
      setMessageIsError(true);
      setMessage("Layanan login tidak dapat dihubungi. Periksa koneksi dan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setMessageIsError(false);
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: formData.get("recovery_identifier"),
          email: formData.get("recovery_email"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Pemulihan password gagal.");
      setMessage(result.message ?? "Jika data akun cocok, tautan pemulihan akan dikirim ke email terdaftar.");
    } catch (recoveryError) {
      setMessageIsError(true);
      setMessage(recoveryError instanceof Error ? recoveryError.message : "Pemulihan password gagal. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-screen relative isolate min-h-[100svh] overflow-x-hidden bg-white px-5 text-slate-800">
      <div aria-hidden="true" className="login-foliage pointer-events-none absolute inset-x-0 bottom-0 h-36" />
      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[420px] flex-col justify-center pb-8 pt-7">
        <section className="w-full px-1">
          <div className="mb-5">
            <h1 className="text-[23px] font-bold leading-7 tracking-tight text-slate-900">{mode === "register" ? "Aktivasi akun warga" : recoveryOpen ? "Lupa password?" : "Masuk ke layanan RW 16"}</h1>
            <p className="mt-1.5 text-sm leading-5 text-slate-500">{mode === "register" ? "Akun harus diverifikasi dan dihubungkan ke keluarga oleh pengurus RW." : recoveryOpen ? "Pemulihan online tersedia untuk akun warga yang memiliki email terdaftar." : "Gunakan username petugas atau Nomor KK 16 digit."}</p>
          </div>

          {mode === "register" ? (
            <div className="mt-4 space-y-3.5">
              <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-950">Pendaftaran mandiri belum tersedia. Tidak ada akun yang dibuat. Hubungi pengurus RW untuk verifikasi data keluarga dan aktivasi akun.</p>
            </div>
          ) : !recoveryOpen ? (
            <form className="mt-4 space-y-3.5" onSubmit={submit}>
              <label className="block text-[13px] font-semibold text-slate-800" htmlFor="identifier">Username / Nomor KK
                <input id="identifier" required name="identifier" type="text" inputMode="text" autoComplete="username" maxLength={64} placeholder="Username petugas atau Nomor KK 16 digit" className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm font-normal outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
              </label>

              <label className="block text-[13px] font-semibold text-slate-800" htmlFor="password">Password
                <span className="relative mt-1.5 block">
                  <input id="password" required name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" maxLength={1024} placeholder="Masukkan password" className="min-h-11 w-full rounded-xl border border-slate-200 px-3.5 pr-12 text-sm font-normal outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
                  <button type="button" aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"} onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-lg text-slate-500 hover:bg-slate-50">
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[18px] w-[18px]"><path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>
                  </button>
                </span>
              </label>

              <div className="-mt-1 flex justify-end"><button type="button" onClick={() => { setRecoveryOpen(true); setMessage(""); }} className="min-h-11 text-xs font-semibold text-emerald-700 hover:text-emerald-900">Lupa password?</button></div>
              {message && <p role={messageIsError ? "alert" : "status"} className={`rounded-xl border p-3 text-sm leading-5 ${messageIsError ? "border-red-200 bg-red-50 text-red-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>{message}</p>}
              <button type="submit" disabled={submitting} className="min-h-12 w-full rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60">
                {submitting ? "Memeriksa akun…" : "Masuk"}
              </button>
            </form>
          ) : (
            <form onSubmit={submitRecovery} className="mt-4 space-y-3 rounded-2xl bg-emerald-50/70 p-4">
              <label className="block text-[13px] font-semibold text-slate-800" htmlFor="recovery_identifier">Username / Nomor KK
                <input id="recovery_identifier" required name="recovery_identifier" inputMode="text" maxLength={64} autoComplete="username" placeholder="Username petugas atau Nomor KK 16 digit" className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
              </label>
              <label className="block text-[13px] font-semibold text-slate-800" htmlFor="recovery_email">Email terdaftar (untuk akun warga)
                <input id="recovery_email" required type="email" name="recovery_email" autoComplete="email" placeholder="nama@email.com" className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
              </label>
              {message && <p role={messageIsError ? "alert" : "status"} className={`rounded-xl border p-3 text-sm leading-5 ${messageIsError ? "border-red-200 bg-red-50 text-red-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>{message}</p>}
              <div className="flex gap-2"><button type="button" onClick={() => { setRecoveryOpen(false); setMessage(""); }} className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700">Batal</button><button disabled={submitting} className="min-h-11 flex-1 rounded-xl bg-emerald-700 text-sm font-semibold text-white disabled:opacity-60">{submitting ? "Mengirim…" : "Kirim tautan"}</button></div>
            </form>
          )}

          {mode === "login" && !recoveryOpen && <p className="mt-4 text-center text-xs text-slate-500">Belum punya akun warga? <button type="button" onClick={() => { setMode("register"); setMessage(""); }} className="font-bold text-emerald-700">Aktivasi akun</button></p>}
          {mode === "register" && <button type="button" onClick={() => { setMode("login"); setMessage(""); }} className="mt-4 min-h-11 w-full text-center text-sm font-semibold text-emerald-700">Kembali ke masuk</button>}
          {recoveryOpen && <button type="button" onClick={() => { setRecoveryOpen(false); setMessage(""); }} className="mt-4 min-h-10 w-full text-center text-sm font-semibold text-emerald-700">Kembali ke masuk</button>}
        </section>

        <p className="mt-4 text-center text-[10px] text-slate-500">© 2026 RW 16 Nuansa Indah Ciomas</p>
      </div>
    </main>
  );
}
