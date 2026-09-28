"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getVerifiedCurrentProfile } from "@/lib/auth/current-profile";

type FamilyMember = {
  id: number;
  nama: string;
  nik: string;
  no_kk: string | null;
  rt: string;
  alamat: string | null;
  jenis_kelamin: string | null;
  status_warga: string | null;
};

type FamilyLetter = {
  id: number;
  jenis_surat: string;
  keperluan: string | null;
  status: string;
  created_at: string;
};

type Dashboard = {
  name: string;
  noKK: string;
  members: FamilyMember[];
  letters: FamilyLetter[];
  pendingLetters: number;
};

const portalByRole: Record<string, string> = {
  RT: "/rt",
  RW: "/",
  BENDAHARA: "/kas",
  ADMIN: "/",
};

function labelStatus(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Menunggu TTD RT",
    DIAJUKAN: "Diajukan",
    MENUNGGU_TTD_RT: "Menunggu tanda tangan RT",
    MENUNGGU_RW: "Menunggu RW",
    MENUNGGU_TTD_RW: "Menunggu tanda tangan RW",
    DISETUJUI: "Disetujui",
    SELESAI: "Selesai",
    DITOLAK: "Ditolak",
    TERBIT: "Terbit",
  };
  return labels[status] ?? status.replaceAll("_", " ");
}

function statusStyle(status: string) {
  if (["SELESAI", "TERBIT", "DISETUJUI"].includes(status)) return "bg-emerald-50 text-emerald-800";
  if (status === "DITOLAK") return "bg-red-50 text-red-800";
  if (status === "DRAFT") return "bg-slate-100 text-slate-700";
  return "bg-amber-50 text-amber-800";
}

export default function Home() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [staffRole, setStaffRole] = useState<string | null>(null);
  const [rwRequests, setRwRequests] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");
      const current = await getVerifiedCurrentProfile();
      if (!active) return;
      if (!current) {
        router.replace("/login");
        return;
      }
      const { user, profile } = current;

      if (profile.role !== "WARGA") {
        if (profile.role === "RW" || profile.role === "ADMIN") {
          setStaffRole(profile.role);
          const { count, error: requestsError } = await supabase
            .from("surat")
            .select("id", { count: "exact", head: true })
            .eq("status", "MENUNGGU_RW");
          if (!active) return;
          setRwRequests(requestsError ? null : count ?? 0);
          setLoading(false);
          return;
        }
        router.replace(portalByRole[profile.role] ?? "/login");
        return;
      }
      const noKK = String(profile.no_kk ?? user.user_metadata?.no_kk ?? "");
      if (!noKK) {
        setError("Akun ini belum terhubung ke KK. Hubungi administrator RW.");
        setLoading(false);
        return;
      }

      const { data: members, error: familyError } = await supabase
        .from("warga")
        .select("id, nama, nik, no_kk, rt, alamat, jenis_kelamin, status_warga")
        .eq("no_kk", noKK)
        .order("nama", { ascending: true });
      if (!active) return;
      if (familyError) {
        setError("Data keluarga belum dapat dimuat. Periksa koneksi dan akses database.");
        setLoading(false);
        return;
      }

      const family = members ?? [];
      let letters: FamilyLetter[] = [];
      let pendingLetters = 0;
      if (family.length > 0) {
        const familyIds = family.map((member) => member.id);
        const [recentResult, pendingResult] = await Promise.all([
          supabase
            .from("surat")
            .select("id, jenis_surat, keperluan, status, created_at")
            .in("warga_id", familyIds)
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("surat")
            .select("id", { count: "exact", head: true })
            .in("warga_id", familyIds)
            .in("status", ["DRAFT", "MENUNGGU_RW", "DISETUJUI"]),
        ]);
        if (!active) return;
        if (recentResult.error) {
          setError("Data keluarga termuat, tetapi riwayat surat belum dapat dibaca.");
          setDashboard({
            name: profile.nama || family[0]?.nama || "Kepala Keluarga",
            noKK,
            members: family,
            letters: [],
            pendingLetters: 0,
          });
          setLoading(false);
          return;
        }
        letters = recentResult.data ?? [];
        pendingLetters = pendingResult.error ? 0 : pendingResult.count ?? 0;
      }

      setDashboard({
        name: profile.nama || family[0]?.nama || "Kepala Keluarga",
        noKK,
        members: family,
        letters,
        pendingLetters,
      });
      setLoading(false);
    }

    void loadDashboard();
    return () => { active = false; };
  }, [refreshKey, router]);

  if (staffRole) {
    const menu = [
      { title: "Arsip Surat", description: "Lihat surat yang tersimpan", href: "/surat", icon: "📂" },
      { title: "Data Warga", description: "Kelola data warga RW 16", href: "/warga", icon: "👥" },
      { title: "Data RT", description: "RT 01 sampai RT 06", href: "/rt", icon: "🏘️" },
      { title: "Pengaturan", description: "Pengaturan aplikasi", href: "/pengaturan", icon: "⚙️" },
    ];

    return (
      <main className="min-h-screen bg-[#f1f3f5] pb-24 text-slate-800">
        <header className="bg-emerald-800 px-5 py-6 text-white">
          <div className="mx-auto max-w-xl">
            <p className="text-sm text-emerald-100">Nuansa Indah Ciomas</p>
            <h1 className="mt-1 text-2xl font-bold">RW 16</h1>
            <p className="mt-1 text-sm text-emerald-100">Pelayanan Administrasi Digital</p>
          </div>
        </header>
        <div className="mx-auto max-w-xl space-y-4 px-4 py-5">
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pengguna</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">{staffRole === "ADMIN" ? "Admin RW" : "Ketua RW"}</h2>
            <p className="mt-1 text-sm text-slate-500">Sistem Administrasi RW 16</p>
          </section>

          <div className="rounded-2xl bg-emerald-700 p-5 text-white shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-emerald-100">Pelayanan</p>
                <h2 className="mt-1 text-xl font-bold">Buat Surat</h2>
                <p className="mt-1 text-sm text-emerald-100">Buat surat administrasi warga</p>
              </div>
              <span className="text-3xl" aria-hidden="true">📝</span>
            </div>
            <p className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-white/15 px-4 text-sm font-semibold text-white/90">Tersedia untuk akun Kepala Keluarga</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
          {menu.map((item) => {
            return <Link key={item.title} href={item.href} className="min-h-32 rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md">
              <span className="text-3xl" aria-hidden="true">{item.icon}</span>
              <span className="mt-3 block font-bold text-slate-900">{item.title}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">{item.description}</span>
            </Link>;
          })}
          </div>

          {staffRole === "ADMIN" ? (
            <Link href="/kas" className="block rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Keuangan RW</p>
              <div className="mt-1 flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">Kas RW</h2><p className="mt-1 text-sm text-slate-600">Kelola pemasukan, pengeluaran, IPK, dan laporan Kas RW 16.</p></div><span className="text-2xl" aria-hidden="true">💰</span></div>
              <span className="mt-4 block border-t border-slate-100 pt-3 text-sm font-semibold text-emerald-700">Buka Kas RW <span className="float-right">→</span></span>
            </Link>
          ) : (
            <section className="block rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm opacity-90">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Keuangan RW</p>
              <div className="mt-1 flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">Kas RW</h2><p className="mt-1 text-sm text-slate-600">Kelola pemasukan, pengeluaran, IPK, dan laporan Kas RW 16.</p></div><span className="text-2xl" aria-hidden="true">💰</span></div>
              <span className="mt-4 block border-t border-slate-100 pt-3 text-sm font-semibold text-emerald-700">Khusus Bendahara / Admin RW <span className="float-right">🔒</span></span>
            </section>
          )}

          <Link href="/rw/surat" className="block rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm ring-1 ring-emerald-100">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Khusus RW / Admin</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <div><h2 className="text-lg font-bold text-slate-900">Surat Masuk RW</h2><p className="mt-1 text-sm text-slate-600">Review surat yang diajukan RT</p></div>
              <span className="relative text-2xl" aria-hidden="true">📥{rwRequests !== null && rwRequests > 0 && <span className="absolute -right-3 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">{rwRequests > 9 ? "9+" : rwRequests}</span>}</span>
            </div>
            <p className={`mt-3 rounded-xl px-3 py-2 text-sm font-semibold ${rwRequests === null ? "bg-slate-50 text-slate-500" : rwRequests > 0 ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>
              {rwRequests === null ? "Notifikasi surat belum dapat dimuat" : rwRequests > 0 ? `${rwRequests} permintaan tanda tangan menunggu ditinjau` : "Tidak ada permintaan tanda tangan baru"}
            </p>
          </Link>

          <section className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm">
            <div><p className="text-sm text-slate-500">Wilayah</p><h2 className="mt-1 font-bold text-slate-900">Nuansa Indah Ciomas</h2><p className="mt-1 text-sm text-slate-500">RW 16 · RT 01–06</p></div><span className="text-3xl" aria-hidden="true">🏠</span>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><h2 className="font-bold text-slate-900">Surat Terbaru</h2><Link href="/surat" className="text-sm font-semibold text-emerald-700">Lihat Semua</Link></div>
            <p className="mt-4 text-sm text-slate-500">Belum ada daftar surat yang ditampilkan.</p>
          </section>
        </div>

        <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto grid max-w-xl grid-cols-4">
            <Link href="/" className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold text-emerald-800"><span className="text-lg">⌂</span>Beranda</Link>
            <Link href="/surat" className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs text-slate-500"><span className="text-lg">▤</span>Surat</Link>
            <Link href="/warga" className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs text-slate-500"><span className="text-lg">♟</span>Warga</Link>
            <Link href="/pengaturan" className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs text-slate-500"><span className="text-lg">⚙</span>Pengaturan</Link>
          </div>
        </nav>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7f4] pb-24 text-slate-800">
      <header className="bg-emerald-900 px-5 pb-8 pt-6 text-white">
        <div className="mx-auto max-w-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-emerald-100">Nuansa Indah Ciomas</p>
              <p className="mt-1 text-xs text-emerald-200">RW 16 · RT 01–06</p>
            </div>
            <Link href="/pengaturan" aria-label="Pengaturan akun" className="grid min-h-11 min-w-11 place-items-center rounded-full bg-white/10 text-lg hover:bg-white/20">⚙</Link>
          </div>
          <p className="mt-8 text-sm text-emerald-100">Dashboard keluarga</p>
          <h1 className="mt-1 text-2xl font-bold">{loading ? "Memuat akun…" : dashboard ? `Halo, ${dashboard.name}` : "Akun Kepala Keluarga"}</h1>
          {dashboard && <p className="mt-2 text-sm text-emerald-100">No. KK {dashboard.noKK}</p>}
        </div>
      </header>

      <div className="mx-auto -mt-4 max-w-xl space-y-4 px-4">
        {loading && <section className="rounded-2xl bg-white p-5 text-sm text-slate-500 shadow-sm">Memuat data keluarga…</section>}
        {error && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          <p>{error}</p>
          {!dashboard && <button type="button" onClick={() => setRefreshKey((value) => value + 1)} className="mt-2 font-semibold underline">Coba lagi</button>}
        </section>}

        {dashboard && <>
          <Link href="/buat-surat" className="flex min-h-24 items-center justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-emerald-100 transition hover:shadow-md">
            <div>
              <p className="text-sm font-semibold text-emerald-800">Pelayanan keluarga</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Ajukan surat</h2>
              <p className="mt-1 text-sm text-slate-500">Mulai pengajuan administrasi warga</p>
            </div>
            <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-2xl">📝</span>
          </Link>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Satu akun untuk satu KK</p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">Anggota keluarga</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{dashboard.members.length}</span>
            </div>
            {dashboard.members.length === 0 ? <p className="mt-4 text-sm text-slate-500">Belum ada anggota yang terhubung ke nomor KK ini.</p> : (
              <ul className="mt-4 divide-y divide-slate-100">
                {dashboard.members.map((member) => (
                  <li key={member.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-800">{member.nama}</p>
                      <p className="mt-1 text-xs text-slate-500">{member.nik} · RT {member.rt}</p>
                    </div>
                    {member.status_warga && <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">{member.status_warga}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status dan riwayat</p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">Surat keluarga</h2>
              </div>
              <Link href="/surat" className="min-h-10 inline-flex items-center text-sm font-semibold text-emerald-800">Lihat semua</Link>
            </div>
            {dashboard.pendingLetters > 0 && <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-amber-500" />{dashboard.pendingLetters} surat masih diproses</p>}
            {dashboard.letters.length === 0 ? <p className="mt-4 text-sm text-slate-500">Belum ada surat untuk keluarga ini.</p> : (
              <ul className="mt-3 space-y-3">
                {dashboard.letters.map((letter) => (
                  <li key={letter.id}>
                    <Link href={`/surat/${letter.id}`} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3 transition hover:bg-slate-100">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-800">{letter.jenis_surat}</p>
                        <p className="mt-1 text-xs text-slate-500">{new Date(letter.created_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle(letter.status)}`}>{labelStatus(letter.status)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>}

        <Link href="/pengaturan/profil" className="block rounded-2xl bg-white p-4 text-sm font-semibold text-slate-700 shadow-sm">Profil & keamanan <span className="float-right text-slate-400">→</span></Link>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-xl grid-cols-4">
          <Link href="/" className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold text-emerald-800"><span className="text-lg">⌂</span>Beranda</Link>
          <Link href="/surat" className="relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs text-slate-500"><span className="relative text-lg">▤{dashboard && dashboard.pendingLetters > 0 && <span className="absolute -right-3 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[9px] font-bold leading-none text-white">{dashboard.pendingLetters > 9 ? "9+" : dashboard.pendingLetters}</span>}</span>Surat</Link>
          <Link href="/buat-surat" className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs text-slate-500"><span className="text-lg">＋</span>Ajukan</Link>
          <Link href="/pengaturan" className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs text-slate-500"><span className="text-lg">⚙</span>Akun</Link>
        </div>
      </nav>
    </main>
  );
}
