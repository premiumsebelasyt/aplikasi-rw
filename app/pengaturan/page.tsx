"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppIcon, IconTile, type AppIconName, type AppIconTone } from "@/components/ui/MobileAppUI";
import { getVerifiedCurrentProfile } from "@/lib/auth/current-profile";
import { PageHeader } from "@/components/ui/AppShell";

type Role = "WARGA" | "RT" | "RW" | "BENDAHARA" | "ADMIN";
type SettingLink = { title: string; description: string; href: string; icon: AppIconName; tone: AppIconTone; roles: Role[] };

const settingLinks: SettingLink[] = [
  { title: "Profil & Keamanan", description: "Data akun dan kata sandi", href: "/pengaturan/profil", icon: "user", tone: "violet", roles: ["WARGA", "RT", "RW", "BENDAHARA", "ADMIN"] },
  { title: "Data Warga", description: "Cari dan kelola data warga", href: "/warga", icon: "users", tone: "green", roles: ["RT", "RW", "ADMIN"] },
  { title: "Data RT", description: "Rekap wilayah RT 01–06", href: "/rt", icon: "building", tone: "amber", roles: ["RT", "RW", "ADMIN"] },
  { title: "Arsip Surat", description: "Status dan riwayat surat", href: "/surat", icon: "file", tone: "blue", roles: ["WARGA", "RT", "RW", "ADMIN"] },
  { title: "Surat Masuk RW", description: "Tinjau permintaan tanda tangan", href: "/rw/surat", icon: "inbox", tone: "rose", roles: ["RW"] },
  { title: "Pengaturan Kas", description: "Kelola kategori kas RW", href: "/kas/pengaturan", icon: "wallet", tone: "cyan", roles: ["BENDAHARA", "ADMIN"] },
];

export default function PengaturanPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void getVerifiedCurrentProfile().then((current) => {
      if (!active) return;
      if (!current) {
        setLoading(false);
        router.replace("/login");
        return;
      }
      setRole(current.profile.role as Role);
      setLoading(false);
    });
    return () => { active = false; };
  }, [router]);

  const links = settingLinks.filter((item) => role && item.roles.includes(role));

  return (
    <main className="min-h-screen bg-[var(--background)] pb-28 text-slate-800">
      <PageHeader eyebrow="Nuansa Indah Ciomas · RW 16" title="Pengaturan" />

      <div className="mx-auto max-w-xl space-y-5 px-4 py-5">
        <section className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_10px_rgba(16,77,50,.035)]">
          <IconTile name="building" tone="green" />
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">Wilayah RW 16</p><p className="mt-0.5 text-xs text-slate-500">Nuansa Indah Ciomas · RT 01–06</p></div>
          <AppIcon name="arrow" className="h-4 w-4 rotate-[-45deg] text-slate-400" />
        </section>

        <section aria-label="Daftar pengaturan">
          <h2 className="mb-2 px-1 type-status font-bold tracking-[.14em] text-slate-500">AKUN & LAYANAN</h2>
          {loading && <p role="status" className="rounded-xl bg-white p-4 text-sm text-slate-500">Memuat pengaturan…</p>}
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white px-3 shadow-[0_2px_10px_rgba(16,77,50,.035)]">
            {links.map((item, index) => <Link key={item.href} href={item.href} className={`flex min-h-[68px] items-center gap-3 py-2.5 ${index ? "border-t border-slate-100" : ""}`}>
              <IconTile name={item.icon} tone={item.tone} className="h-10 w-10 rounded-xl" />
              <span className="min-w-0 flex-1"><span className="block truncate type-body-small font-semibold text-slate-900">{item.title}</span><span className="mt-0.5 block truncate type-metadata text-slate-500">{item.description}</span></span>
              <AppIcon name="arrow" className="h-4 w-4 shrink-0 rotate-[-45deg] text-slate-400" />
            </Link>)}
          </div>
        </section>

        <p className="px-1 text-center type-metadata text-slate-400">Aplikasi Digital RW 16 · Nuansa Indah Ciomas</p>
      </div>
    </main>
  );
}
