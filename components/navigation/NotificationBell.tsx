"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getVerifiedCurrentProfile } from "@/lib/auth/current-profile";
import { supabase } from "@/lib/supabase/client";
import { AppIcon } from "@/components/ui/MobileAppUI";

const inboxByRole: Record<string, string> = {
  WARGA: "/surat",
  RT: "/rt",
  RW: "/rw/surat",
  ADMIN: "/menu",
  BENDAHARA: "/kas/transaksi",
};

async function countActionableLetters(role: string, rt: string | null, noKK: string | null) {
  if (role === "RW") {
    return supabase.from("surat").select("id", { count: "exact", head: true }).eq("status", "MENUNGGU_RW");
  }
  if (role === "RT" && rt) {
    return supabase.from("surat").select("id", { count: "exact", head: true }).eq("rt", rt).eq("status", "DRAFT");
  }
  if (role === "WARGA" && noKK) {
    const { data: family, error } = await supabase.from("warga").select("id").eq("no_kk", noKK);
    if (error || !family?.length) return { count: 0, error };
    return supabase.from("surat").select("id", { count: "exact", head: true }).in("warga_id", family.map((item) => item.id)).in("status", ["DRAFT", "MENUNGGU_RW", "DISETUJUI"]);
  }
  return { count: 0, error: null };
}

export function NotificationBell({ countOverride }: { countOverride?: number | null }) {
  const [target, setTarget] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const current = await getVerifiedCurrentProfile();
      if (!active || !current) return;
      const { profile } = current;
      const href = inboxByRole[profile.role];
      if (!href) return;
      setTarget(href);
      if (countOverride !== undefined) {
        setCount(countOverride);
        return;
      }
      const result = await countActionableLetters(profile.role, profile.rt, profile.no_kk);
      if (active) setCount(result.error ? null : result.count ?? 0);
    })();
    return () => { active = false; };
  }, [countOverride]);

  if (!target) return <span aria-hidden="true" className="h-11 w-11 shrink-0" />;
  const badge = count !== null && count > 0 ? (count > 9 ? "9+" : String(count)) : null;
  return <Link href={target} aria-label={badge ? `Notifikasi, ${count} surat berjalan` : "Notifikasi"} className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-emerald-600">
    <AppIcon name="bell" className="h-5 w-5" />
    {badge && <span aria-hidden="true" className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white">{badge}</span>}
  </Link>;
}
