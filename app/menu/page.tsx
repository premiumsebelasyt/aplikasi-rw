"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getVerifiedCurrentProfile } from "@/lib/auth/current-profile";
import { AppIcon, IconTile, type AppIconName, type AppIconTone } from "@/components/ui/MobileAppUI";
import { DashboardLayout } from "@/components/ui/AppShell";

type MenuGroup = "LAYANAN" | "KEUANGAN" | "LAINNYA";
type MenuItem = { title: string; description: string; href: string; icon: AppIconName; tone: AppIconTone; group: MenuGroup; roles: string[] };
const menuItems: MenuItem[] = [
  { title: "Buat Surat", description: "Ajukan surat administrasi keluarga", href: "/buat-surat", icon: "plus", tone: "green", group: "LAYANAN", roles: ["WARGA"] },
  { title: "Arsip Surat", description: "Riwayat dan status surat", href: "/surat", icon: "file", tone: "blue", group: "LAYANAN", roles: ["WARGA", "RT", "RW", "ADMIN"] },
  { title: "Surat Masuk RW", description: "Tinjau permintaan tanda tangan", href: "/rw/surat", icon: "inbox", tone: "rose", group: "LAYANAN", roles: ["RW"] },
  { title: "Data Warga", description: "Cari dan kelola data warga", href: "/warga", icon: "users", tone: "green", group: "LAYANAN", roles: ["RT", "RW", "ADMIN"] },
  { title: "Data RT", description: "Rekap wilayah RT 01–06", href: "/rt", icon: "building", tone: "amber", group: "LAYANAN", roles: ["RT", "RW", "ADMIN"] },
  { title: "Kas RW", description: "Saldo dan ringkasan kas RW", href: "/kas", icon: "wallet", tone: "amber", group: "KEUANGAN", roles: ["RW", "BENDAHARA", "ADMIN"] },
  { title: "Transaksi", description: "Daftar transaksi keuangan RW", href: "/kas/transaksi", icon: "chart", tone: "blue", group: "KEUANGAN", roles: ["RW", "BENDAHARA", "ADMIN"] },
  { title: "IPK / Iuran", description: "Rekap iuran per RT", href: "/kas/ipk", icon: "wallet", tone: "rose", group: "KEUANGAN", roles: ["RW", "BENDAHARA", "ADMIN"] },
  { title: "Laporan Kas", description: "Lihat rekap dan laporan", href: "/kas/laporan", icon: "chart", tone: "violet", group: "KEUANGAN", roles: ["RW", "BENDAHARA", "ADMIN"] },
  { title: "Pengaturan", description: "Profil dan pengaturan aplikasi", href: "/pengaturan", icon: "settings", tone: "cyan", group: "LAINNYA", roles: ["WARGA", "RT", "RW", "BENDAHARA", "ADMIN"] },
  { title: "Profil & Keamanan", description: "Ubah profil dan password", href: "/pengaturan/profil", icon: "user", tone: "violet", group: "LAINNYA", roles: ["WARGA", "RT", "RW", "BENDAHARA", "ADMIN"] },
];

export default function MenuPage() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void getVerifiedCurrentProfile().then((current) => {
      if (!active) return;
      if (!current) { setLoading(false); router.replace("/login"); return; }
      setRole(current.profile.role);
      setName(current.profile.nama_lengkap || current.profile.nama || "Pengguna");
      setLoading(false);
    });
    return () => { active = false; };
  }, [router]);
  const items = menuItems.filter((item) => item.roles.includes(role) && `${item.title} ${item.description}`.toLocaleLowerCase("id-ID").includes(search.trim().toLocaleLowerCase("id-ID")));
  const groups: MenuGroup[] = ["LAYANAN", "KEUANGAN", "LAINNYA"];

  return <DashboardLayout eyebrow="Nuansa Indah Ciomas · RW 16" title="Menu" subtitle={name ? `Halo, ${name}` : "Fitur layanan sesuai peran Anda"} contentWidth="max-w-3xl" action={<span aria-label={`Akun ${name}`} className="grid h-10 w-10 place-items-center rounded-full bg-emerald-50 font-bold text-emerald-700">{name.slice(0, 1).toUpperCase()}</span>}>
      <label className="mb-5 flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 text-slate-500 shadow-sm">
        <AppIcon name="search" className="h-4 w-4 shrink-0" />
        <span className="sr-only">Cari menu</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari menu..." className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" />
        {search && <button type="button" onClick={() => setSearch("")} aria-label="Hapus pencarian" className="grid h-11 w-11 place-items-center rounded-full text-slate-500"><span aria-hidden="true">×</span></button>}
      </label>
      <div className="space-y-5">
        {groups.map((group) => {
          const groupItems = items.filter((item) => item.group === group);
          if (!groupItems.length) return null;
          return <section key={group} aria-labelledby={`menu-${group.toLowerCase()}`}>
            <h2 id={`menu-${group.toLowerCase()}`} className="type-eyebrow mb-2 px-1 tracking-[.12em] text-slate-500">{group}</h2>
            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white px-3 shadow-[0_2px_10px_rgba(16,77,50,.035)]">
              {groupItems.map((item, index) => <Link key={item.href} href={item.href} className={`flex min-h-[68px] items-center gap-3 py-2.5 ${index ? "border-t border-slate-100" : ""}`}>
                <IconTile name={item.icon} tone={item.tone} className="h-10 w-10 rounded-xl" />
                <span className="min-w-0 flex-1"><span className="type-card-title block break-words text-slate-900">{item.title}</span><span className="type-secondary mt-0.5 block break-words text-slate-500">{item.description}</span></span>
                <AppIcon name="arrow" className="h-4 w-4 shrink-0 rotate-[-45deg] text-slate-400" />
              </Link>)}
            </div>
          </section>;
        })}
        {loading && <p role="status" className="rounded-2xl bg-white p-5 text-center text-sm text-slate-500">Memuat menu…</p>}
        {!loading && items.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500">Menu tidak ditemukan.</p>}
      </div>
  </DashboardLayout>;
}
