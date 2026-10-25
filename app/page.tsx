"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getVerifiedCurrentProfile } from "@/lib/auth/current-profile";
import { ambilKategoriWarga } from "@/lib/warga/kategori";
import { AppIcon, IconTile, MenuCard, SectionHeading, StatCard } from "@/components/ui/MobileAppUI";
import { DashboardIntro, DashboardLayout } from "@/components/ui/AppShell";

type FamilyMember = {
  id: number;
  nama: string;
  nik: string;
  no_kk: string | null;
  rt: string;
  alamat: string | null;
  jenis_kelamin: string | null;
  status_warga: string | null;
  kategori: string[];
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
  ADMIN: "/menu",
};

function labelStatus(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    MENUNGGU_RT: "Menunggu pemeriksaan RT",
    DISETUJUI_RT: "Disetujui RT",
    MENUNGGU_RW: "Menunggu RW",
    DISETUJUI_RW: "Disetujui RW · PDF menunggu",
    PERLU_PERBAIKAN: "Perlu perbaikan",
    FINALIZING_PDF: "Finalisasi PDF",
    PDF_RETRY: "PDF perlu dicoba ulang",
    TERBIT: "Terbit",
    DIBATALKAN: "Dibatalkan",
  };
  return labels[status] ?? status.replaceAll("_", " ");
}

function statusStyle(status: string) {
  if (["TERBIT", "DISETUJUI_RW"].includes(status)) return "bg-emerald-50 text-emerald-800";
  if (status === "PERLU_PERBAIKAN") return "bg-red-50 text-red-800";
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
      const { profile } = current;

      if (profile.role !== "WARGA") {
        if (profile.role === "RW") {
          setStaffRole("RW");
          const requestsResult = await supabase
            .from("surat")
            .select("id", { count: "exact", head: true })
            .eq("status", "MENUNGGU_RW");
          if (!active) return;
          setRwRequests(requestsResult.error ? null : requestsResult.count ?? 0);
          setLoading(false);
          return;
        }
        router.replace(portalByRole[profile.role] ?? "/login");
        return;
      }
      // Authorization scope comes only from the verified database profile.
      // Auth user_metadata is user-editable and must never widen family access.
      const noKK = String(profile.no_kk ?? "");
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

      let family = (members ?? []).map((member) => ({ ...member, kategori: [] as string[] }));
      if (family.length > 0) {
        try {
          const categoryData = await ambilKategoriWarga();
          if (!active) return;
          family = family.map((member) => {
            const categoryIds = new Set(categoryData.relations
              .filter((relation) => relation.warga_id === member.id)
              .map((relation) => relation.kategori_id));
            return {
              ...member,
              kategori: categoryData.categories
                .filter((category) => categoryIds.has(category.id))
                .map((category) => category.nama),
            };
          });
        } catch {
          if (!active) return;
          setError("Data keluarga termuat, tetapi kategori anggota belum dapat dibaca.");
        }
      }
      let letters: FamilyLetter[] = [];
      let pendingLetters = 0;
      if (family.length > 0) {
        const familyIds = family.map((member) => member.id);
        const [recentResult, pendingResult] = await Promise.all([
          supabase
            .from("surat")
            .select("id, jenis_surat, payload, status, created_at")
            .in("warga_id", familyIds)
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("surat")
            .select("id", { count: "exact", head: true })
            .in("warga_id", familyIds)
            .in("status", ["DRAFT", "MENUNGGU_RT", "DISETUJUI_RT", "MENUNGGU_RW", "PERLU_PERBAIKAN"]),
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
        letters = (recentResult.data ?? []).map((letter) => ({
          ...letter,
          keperluan: typeof letter.payload?.keperluan === "string" ? letter.payload.keperluan : null,
        }));
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

  if (loading) {
    return (
      <main
        aria-busy="true"
        className="grid min-h-screen place-items-center bg-[var(--background)] px-4 text-slate-500"
      >
        <p role="status" className="text-sm">Memverifikasi sesi akun…</p>
      </main>
    );
  }

  const isStaff = Boolean(staffRole);
  const rtLabel = dashboard?.members[0]?.rt ? `RT ${dashboard.members[0].rt} · RW 16` : "Warga · RW 16";
  const staffMenu = [
    { title: "Surat Masuk RW", description: "Permintaan tanda tangan", href: "/rw/surat", icon: "inbox" as const, tone: "rose" as const, badge: rwRequests && rwRequests > 0 ? String(rwRequests > 9 ? "9+" : rwRequests) : undefined },
    { title: "Arsip Surat", description: "Riwayat semua surat", href: "/surat", icon: "file" as const, tone: "blue" as const },
    { title: "Data Warga", description: "Kelola data warga", href: "/warga", icon: "users" as const, tone: "green" as const },
    { title: "Data RT", description: "Wilayah RT 01–06", href: "/rt", icon: "building" as const, tone: "amber" as const },
    { title: "Pengaturan", description: "Profil dan aplikasi", href: "/pengaturan", icon: "settings" as const, tone: "cyan" as const },
  ];

  return (
    <DashboardLayout
      brand
      eyebrow="RW 16 · Pelayanan Warga"
      title={isStaff ? "Dashboard Ketua RW" : "Dashboard Warga"}
      subtitle={isStaff ? "Layanan administrasi RW 16" : dashboard?.name || "Layanan administrasi keluarga"}
      notificationCount={isStaff ? rwRequests : undefined}
    >
        <DashboardIntro
          eyebrow={isStaff ? "Ketua RW" : "Warga"}
          title={loading ? "Memuat akun…" : isStaff ? "RW 16" : dashboard ? dashboard.name : "Kepala Keluarga"}
          description={isStaff ? "Pelayanan wilayah RT 01–06" : rtLabel}
        />

        {isStaff ? <>
          <section aria-label="Ringkasan RW" className="grid grid-cols-2 gap-3">
            <StatCard label="Menunggu tanda tangan RW" value={rwRequests ?? "—"} icon="inbox" tone="amber" />
            <StatCard label="Wilayah RT terdaftar" value="6" icon="building" tone="blue" />
          </section>
          <section>
            <SectionHeading title="Menu Utama" action="Lihat menu" href="/menu" />
            <div className="grid grid-cols-2 gap-2.5">{staffMenu.slice(0, 4).map((item) => <MenuCard key={item.title} {...item} />)}</div>
          </section>
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_10px_rgba(16,77,50,.035)]">
            <SectionHeading title="Permintaan surat" action="Buka inbox" href="/rw/surat" />
            <Link href="/rw/surat" className={`flex items-center gap-3 rounded-xl px-3 py-3 ${rwRequests ? "bg-amber-50" : "bg-emerald-50"}`}>
              <IconTile name="inbox" tone={rwRequests ? "amber" : "green"} className="h-9 w-9 rounded-xl" />
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{rwRequests === null ? "Notifikasi belum termuat" : rwRequests ? `${rwRequests} surat menunggu ditinjau` : "Tidak ada permintaan baru"}</p><p className="mt-0.5 type-metadata text-slate-500">Surat yang menunggu tanda tangan RW</p></div>
              <AppIcon name="arrow" className="h-4 w-4 text-slate-400" />
            </Link>
          </section>
          <section className="grid grid-cols-2 gap-2.5">{staffMenu.slice(4).map((item) => <MenuCard key={item.title} {...item} />)}</section>
        </> : <>
          {loading && <section className="rounded-2xl bg-white p-4 text-sm text-slate-500">Memuat data keluarga…</section>}
          {error && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><p>{error}</p>{!dashboard && <button type="button" onClick={() => setRefreshKey((value) => value + 1)} className="mt-2 font-semibold underline">Coba lagi</button>}</section>}
          {dashboard && <>
            <section className="grid grid-cols-2 gap-3">
              <StatCard label="Anggota keluarga" value={dashboard.members.length} icon="family" tone="green" />
              <StatCard label="Surat diproses" value={dashboard.pendingLetters} icon="file" tone="violet" />
            </section>
            <section>
              <SectionHeading title="Menu Utama" action="Lihat menu" href="/menu" />
              <div className="grid grid-cols-2 gap-2.5">
                <MenuCard title="Buat Surat" description="Ajukan surat keluarga" href="/buat-surat" icon="plus" tone="green" />
                <MenuCard title="Surat Saya" description="Status dan riwayat" href="/surat" icon="file" tone="blue" />
                <MenuCard title="Data Keluarga" description="Anggota dalam KK" href="#anggota-keluarga" icon="family" tone="violet" />
                <MenuCard title="Pengaturan" description="Profil dan keamanan" href="/pengaturan" icon="settings" tone="amber" />
              </div>
            </section>
            <section id="anggota-keluarga" className="scroll-mt-20 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_10px_rgba(16,77,50,.035)]">
              <SectionHeading title="Anggota keluarga" />
              {dashboard.members.length === 0 ? <p className="text-sm text-slate-500">Belum ada anggota yang terhubung ke nomor KK ini.</p> : <ul className="divide-y divide-slate-100">{dashboard.members.map((member) => <li key={member.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><IconTile name="user" tone="cyan" className="h-9 w-9 rounded-full" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{member.nama}</p><p className="mt-0.5 type-metadata text-slate-500">RT {member.rt}{member.status_warga ? ` · ${member.status_warga}` : ""}</p>{member.kategori.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{member.kategori.map((category) => <span key={category} className="rounded-full bg-emerald-50 px-2 py-0.5 type-status font-medium text-emerald-800">{category}</span>)}</div>}</div></li>)}</ul>}
            </section>
            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_10px_rgba(16,77,50,.035)]">
              <SectionHeading title="Surat terbaru" action="Lihat semua" href="/surat" />
              {dashboard.pendingLetters > 0 && <p className="mb-3 text-xs text-amber-800">{dashboard.pendingLetters} surat masih diproses</p>}
              {dashboard.letters.length === 0 ? <p className="text-sm text-slate-500">Belum ada surat untuk keluarga ini.</p> : <ul className="divide-y divide-slate-100">{dashboard.letters.map((letter) => <li key={letter.id}><Link href={`/surat/${letter.id}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><IconTile name="file" tone="green" className="h-9 w-9 rounded-xl" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900">{letter.jenis_surat}</span><span className="mt-0.5 block type-metadata text-slate-500">{new Date(letter.created_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}</span></span><span className={`shrink-0 rounded-full px-2 py-1 type-status font-semibold ${statusStyle(letter.status)}`}>{labelStatus(letter.status)}</span></Link></li>)}</ul>}
            </section>
          </>}
        </>}
    </DashboardLayout>
  );
}
