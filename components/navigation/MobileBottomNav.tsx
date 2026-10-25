"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getVerifiedCurrentProfile } from "@/lib/auth/current-profile";
import { navigationItemsForRole } from "@/lib/navigation/role-nav.mjs";

const icons: Record<string, string> = {
  home: "M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9 20v-6h6v6",
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8",
  people: "M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 8v6M23 11h-6",
  wallet: "M3 6.5A2.5 2.5 0 0 1 5.5 4H21v16H5.5A2.5 2.5 0 0 1 3 17.5zM3 7h18M16 13h5M17 13h.01",
  menu: "M4 6h16M4 12h16M4 18h16",
  inbox: "M4 4h16v16H4zM4 13h4l2 3h4l2-3h4",
  user: "M20 21a8 8 0 0 0-16 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
};

export function MobileBottomNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void getVerifiedCurrentProfile().then((value) => { if (active) setRole(value?.profile.role ?? null); });
    return () => { active = false; };
  }, [pathname]);
  if (!role || pathname === "/login" || pathname.startsWith("/auth/")) return null;

  const items = navigationItemsForRole(role);
  if (!items.length) return null;

  return <nav aria-label="Navigasi utama" className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-white/95 backdrop-blur-md">
    <div className={`mx-auto grid max-w-xl ${items.length === 3 ? "grid-cols-3" : "grid-cols-5"}`}>
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
        return <Link key={item.title} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-[62px] flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium ${active ? "text-emerald-700" : "text-slate-500"}`}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[21px] w-[21px]"><path d={icons[item.icon]} /></svg>
          <span className="max-w-full truncate">{item.title}</span>
        </Link>;
      })}
    </div>
  </nav>;
}
