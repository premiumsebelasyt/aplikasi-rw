"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";

type AccessRole = "WARGA" | "RT" | "RW" | "BENDAHARA" | "ADMIN";

const roles: { id: AccessRole; label: string; description: string }[] = [
  { id: "WARGA", label: "Kepala Keluarga", description: "Akses keluarga dan pengajuan surat" },
  { id: "RT", label: "Ketua RT", description: "Review surat dan data RT" },
  { id: "RW", label: "Ketua RW", description: "Administrasi dan surat masuk RW" },
  { id: "BENDAHARA", label: "Bendahara", description: "Kas, IPK, dan laporan RW" },
  { id: "ADMIN", label: "Admin RW", description: "Administrasi sistem RW" },
];

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<AccessRole>("WARGA");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isWarga = role === "WARGA";

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
          role,
          identifier: formData.get("identifier"),
          password: formData.get("password"),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessageIsError(true);
        setMessage(typeof result.error === "string" ? result.error : "Layanan login menolak permintaan. Coba lagi.");
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession(result.session);
      if (sessionError) {
        setMessageIsError(true);
        setMessage("Autentikasi diterima, tetapi sesi aplikasi tidak dapat disimpan. Coba lagi.");
        return;
      }

      const homeByRole: Record<AccessRole, string> = {
        WARGA: "/",
        RT: "/rt",
        RW: "/",
        BENDAHARA: "/kas",
        ADMIN: "/menu",
      };
      router.replace(homeByRole[result.role as AccessRole] ?? "/");
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
          role,
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

  function chooseRole(nextRole: AccessRole) {
    setRole(nextRole);
    setMode("login");
    setMessage("");
    setMessageIsError(false);
    setRecoveryOpen(false);
  }

  return (
    <main className="login-screen relative isolate min-h-[100svh] overflow-x-hidden bg-white px-5 text-slate-800">
      <div aria-hidden="true" className="login-foliage pointer-events-none absolute inset-x-0 bottom-0 h-36" />
      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[420px] flex-col justify-center pb-8 pt-7">
        <section className="w-full px-1">
          <div className="mb-5">
            <h1 className="text-[23px] font-bold leading-7 tracking-tight text-slate-900">{mode === "register" ? "Aktivasi akun warga" : recoveryOpen ? "Lupa password?" : "Masuk ke layanan warga"}</h1>
            <p className="mt-1.5 text-sm leading-5 text-slate-500">{mode === "register" ? "Akun harus diverifikasi dan dihubungkan ke keluarga oleh pengurus RW." : recoveryOpen ? "Masukkan informasi akun untuk menerima tautan pemulihan." : "Akses keluarga dan pengajuan surat."}</p>
          </div>

          {!recoveryOpen && <>
            <label className="block text-[13px] font-semibold text-slate-800" htmlFor="account-role">Jenis akun</label>
            <div className="relative mt-1.5">
              <select id="account-role" value={role} onChange={(event) => chooseRole(event.target.value as AccessRole)} className="min-h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 pr-10 text-sm font-medium text-slate-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100">
                {roles.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"><path d="m7 10 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
          </>}

          {mode === "register" ? (
            <div className="mt-4 space-y-3.5">
              <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-950">Pendaftaran mandiri belum tersedia. Tidak ada akun yang dibuat. Hubungi pengurus RW untuk verifikasi data keluarga dan aktivasi akun.</p>
            </div>
          ) : <form className="mt-4 space-y-3.5" onSubmit={submit}>
            {!recoveryOpen ? (
              <label className="block text-[13px] font-semibold text-slate-800">{isWarga ? "Nomor KK" : "ID Login atau email internal"}
                <input required name="identifier" type="text" inputMode={isWarga ? "numeric" : "text"} autoComplete="username" maxLength={isWarga ? 16 : 48} pattern={isWarga ? "[0-9]{16}" : undefined} placeholder={isWarga ? "Masukkan nomor KK" : "Contoh: ketua-rt01 atau ketua-rt01@rw16.mail"} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm font-normal outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
              </label>
            ) : null}

            {!recoveryOpen && <label className="block text-[13px] font-semibold text-slate-800">Password
              <span className="relative mt-1.5 block">
                <input required name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Masukkan password" className="min-h-11 w-full rounded-xl border border-slate-200 px-3.5 pr-12 text-sm font-normal outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
                <button type="button" aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"} onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-lg text-slate-500 hover:bg-slate-50">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[18px] w-[18px]"><path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>
                </button>
              </span>
            </label>}

            {mode === "login" && !recoveryOpen && <div className="-mt-1 flex justify-end"><button type="button" onClick={() => { setRecoveryOpen(true); setMessage(""); }} className="min-h-11 text-xs font-semibold text-emerald-700 hover:text-emerald-900">Lupa password?</button></div>}
            {message && <p role={messageIsError ? "alert" : "status"} className={`rounded-xl border p-3 text-sm leading-5 ${messageIsError ? "border-red-200 bg-red-50 text-red-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>{message}</p>}
            {!recoveryOpen && <button type="submit" disabled={submitting} className="min-h-12 w-full rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60">
              {submitting ? "Memeriksa akun…" : `Masuk sebagai ${roles.find((item) => item.id === role)?.label}`}
            </button>}
          </form>}

          {recoveryOpen && <form onSubmit={submitRecovery} className="mt-4 space-y-3 rounded-2xl bg-emerald-50/70 p-4">
            <label className="block text-[13px] font-semibold text-slate-800">{isWarga ? "Nomor KK" : "ID Login"}
              <input required name="recovery_identifier" inputMode={isWarga ? "numeric" : "text"} maxLength={isWarga ? 16 : undefined} pattern={isWarga ? "[0-9]{16}" : undefined} placeholder={isWarga ? "Masukkan nomor KK" : "Masukkan ID login"} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
            </label>
            <label className="block text-[13px] font-semibold text-slate-800">Email terdaftar
              <input required type="email" name="recovery_email" autoComplete="email" placeholder="nama@email.com" className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
            </label>
            <div className="flex gap-2"><button type="button" onClick={() => { setRecoveryOpen(false); setMessage(""); }} className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700">Batal</button><button disabled={submitting} className="min-h-11 flex-1 rounded-xl bg-emerald-700 text-sm font-semibold text-white disabled:opacity-60">{submitting ? "Mengirim…" : "Kirim tautan"}</button></div>
          </form>}

          {mode === "login" && !recoveryOpen && isWarga && <p className="mt-4 text-center text-xs text-slate-500">Belum punya akun? <button type="button" onClick={() => { setMode("register"); setMessage(""); }} className="font-bold text-emerald-700">Daftar akun warga</button></p>}
          {mode === "register" && <button type="button" onClick={() => { setMode("login"); setMessage(""); }} className="mt-4 min-h-11 w-full text-center text-sm font-semibold text-emerald-700">Kembali ke masuk</button>}
          {mode === "login" && recoveryOpen && <button type="button" onClick={() => { setRecoveryOpen(false); setMessage(""); }} className="mt-4 min-h-10 w-full text-center text-sm font-semibold text-emerald-700">Kembali ke masuk</button>}
          {!isWarga && mode === "login" && !recoveryOpen && <p className="mt-3 text-center text-[11px] leading-4 text-slate-500">Akun petugas dibuat oleh administrator RW.</p>}
        </section>

        <p className="mt-4 text-center text-[10px] text-slate-500">© 2026 RW 16 Nuansa Indah Ciomas</p>
      </div>
    </main>
  );
}
