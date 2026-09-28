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
  const isWarga = role === "WARGA";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setMessageIsError(false);
    const formData = new FormData(event.currentTarget);

    try {
      if (mode === "register") {
        const response = await fetch("/api/auth/sign-up", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            no_kk: formData.get("no_kk"),
            email: formData.get("email"),
            no_hp: formData.get("no_hp"),
            password: formData.get("password"),
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Pendaftaran gagal.");
        setMessage(result.message ?? "Pendaftaran diterima. Periksa email untuk verifikasi akun.");
        setSubmitting(false);
        return;
      }

      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          identifier: formData.get("identifier"),
          password: formData.get("password"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Login gagal.");

      const { error: sessionError } = await supabase.auth.setSession(result.session);
      if (sessionError) throw sessionError;

      const homeByRole: Record<AccessRole, string> = {
        WARGA: "/",
        RT: "/rt",
        RW: "/",
        BENDAHARA: "/kas",
        ADMIN: "/",
      };
      router.replace(homeByRole[result.role as AccessRole] ?? "/");
    } catch (submitError) {
      setMessageIsError(true);
      setMessage(submitError instanceof Error ? submitError.message : "Terjadi kesalahan. Coba lagi.");
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
    <main className="min-h-screen bg-[#f5f7f4] px-4 py-8 text-slate-800 sm:py-12">
      <div className="mx-auto max-w-lg">
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-7">
            <p className="text-sm font-semibold text-emerald-800">RW 16 · Nuansa Indah Ciomas</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Masuk ke layanan warga</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Pilih jenis akun agar diarahkan ke akses yang sesuai.</p>
          </div>

          <label className="block text-sm font-semibold text-slate-700" htmlFor="account-role">Jenis akun</label>
          <div className="relative mt-2">
            <select
              id="account-role"
              value={role}
              onChange={(event) => chooseRole(event.target.value as AccessRole)}
              className="min-h-14 w-full appearance-none rounded-2xl border border-slate-300 bg-white px-4 pr-12 text-base font-semibold text-slate-900 outline-none transition hover:border-emerald-600 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
            >
              {roles.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg text-emerald-800">⌄</span>
          </div>
          <p className="mt-2 text-sm leading-5 text-slate-500">{roles.find((item) => item.id === role)?.description}</p>

          <div className="mt-6 flex rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Akses akun">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              onClick={() => { setMode("login"); setMessage(""); }}
              className={`min-h-11 flex-1 rounded-lg text-sm font-semibold ${mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
            >
              Masuk
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              disabled={!isWarga}
              onClick={() => { setMode("register"); setMessage(""); }}
              className={`min-h-11 flex-1 rounded-lg text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${mode === "register" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
            >
              Daftar akun warga
            </button>
          </div>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            {mode === "register" ? (
              <>
                <label className="block text-sm font-medium text-slate-700">
                  Nomor KK
                  <input required name="no_kk" inputMode="numeric" autoComplete="off" minLength={16} maxLength={16} pattern="[0-9]{16}" placeholder="16 digit nomor KK" className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 text-base outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
                  <span className="mt-1 block text-xs font-normal text-slate-500">Gunakan KK yang terdaftar di data warga RW 16.</span>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Email aktif
                  <input required name="email" type="email" autoComplete="email" placeholder="nama@email.com" className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 text-base outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
                  <span className="mt-1 block text-xs font-normal text-slate-500">Email dipakai untuk verifikasi dan pemulihan password.</span>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Nomor HP
                  <input required name="no_hp" type="tel" autoComplete="tel" inputMode="tel" placeholder="08xxxxxxxxxx" className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 text-base outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
                </label>
              </>
            ) : (
              <label className="block text-sm font-medium text-slate-700">
                {isWarga ? "Nomor KK" : "ID Login"}
                <input
                  required
                  name="identifier"
                  type="text"
                  inputMode={isWarga ? "numeric" : "text"}
                  autoComplete="username"
                  maxLength={isWarga ? 16 : undefined}
                  pattern={isWarga ? "[0-9]{16}" : undefined}
                  placeholder={isWarga ? "16 digit nomor KK" : "ID dari administrator"}
                  className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 text-base outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
            )}

            <label className="block text-sm font-medium text-slate-700">
              Password
              <input required name="password" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={8} placeholder={mode === "register" ? "Minimal 8 karakter" : "Masukkan password"} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-4 text-base outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
            </label>
            {!isWarga && mode === "login" && <p className="-mt-2 text-xs leading-5 text-slate-500">Gunakan ID login yang diberikan administrator RW.</p>}

            {mode === "login" && !recoveryOpen && (
              <div className="text-right">
                <button type="button" onClick={() => { setRecoveryOpen(true); setMessage(""); }} className="min-h-10 text-sm font-semibold text-emerald-800 hover:text-emerald-950">
                  Lupa password?
                </button>
              </div>
            )}

            {message && <p role={messageIsError ? "alert" : "status"} className={`rounded-xl border p-3 text-sm leading-6 ${messageIsError ? "border-red-200 bg-red-50 text-red-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>{message}</p>}

            <button type="submit" disabled={submitting} className="min-h-12 w-full rounded-xl bg-emerald-800 px-4 font-semibold text-white transition hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60">
              {submitting ? "Memproses…" : mode === "register" ? "Daftar sebagai Kepala Keluarga" : `Masuk sebagai ${roles.find((item) => item.id === role)?.label}`}
            </button>
          </form>

          {mode === "login" && recoveryOpen && (
            <form onSubmit={submitRecovery} className="mt-5 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <h2 className="font-semibold text-slate-900">Pulihkan password</h2>
                <p className="mt-1 text-xs leading-5 text-slate-600">Masukkan ID akun dan email yang terdaftar. Tautan hanya dikirim jika keduanya cocok.</p>
              </div>
              <label className="block text-sm font-medium text-slate-700">{isWarga ? "Nomor KK" : "ID Login"}
                <input required name="recovery_identifier" inputMode={isWarga ? "numeric" : "text"} maxLength={isWarga ? 16 : undefined} pattern={isWarga ? "[0-9]{16}" : undefined} placeholder={isWarga ? "16 digit nomor KK" : "ID dari administrator"} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
              </label>
              <label className="block text-sm font-medium text-slate-700">Email terdaftar
                <input required type="email" name="recovery_email" autoComplete="email" placeholder="nama@email.com" className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setRecoveryOpen(false); setMessage(""); }} className="min-h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700">Batal</button>
                <button disabled={submitting} className="min-h-11 flex-1 rounded-xl bg-emerald-800 px-3 text-sm font-semibold text-white disabled:opacity-60">{submitting ? "Mengirim…" : "Kirim tautan"}</button>
              </div>
            </form>
          )}

          {isWarga && mode === "login" && <p className="mt-5 text-center text-sm text-slate-600">Belum punya akun? <button type="button" onClick={() => { setMode("register"); setMessage(""); }} className="font-semibold text-emerald-800 hover:text-emerald-950">Daftar sekarang</button></p>}

          {!isWarga && <p className="mt-5 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">Akun petugas dibuat atau ditetapkan oleh administrator.</p>}
        </section>

        <p className="px-4 py-5 text-center text-xs leading-5 text-slate-500">Data akun digunakan untuk layanan administrasi RW 16 Nuansa Indah Ciomas.</p>
      </div>
    </main>
  );
}
