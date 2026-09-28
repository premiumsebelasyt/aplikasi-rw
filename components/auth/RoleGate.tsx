"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getCachedVerifiedProfile, getVerifiedCurrentProfile } from "@/lib/auth/current-profile";

type Role = "WARGA" | "RT" | "RW" | "BENDAHARA" | "ADMIN";

const roleHome: Record<Role, string> = {
  WARGA: "/",
  RT: "/rt",
  RW: "/",
  BENDAHARA: "/kas",
  ADMIN: "/",
};

export function RoleGate({ children, allowedRoles }: { children: ReactNode; allowedRoles: Role[] }) {
  const router = useRouter();
  const allowedRolesKey = allowedRoles.join(",");
  const [ready, setReady] = useState(() => {
    const current = getCachedVerifiedProfile();
    return !!current && allowedRoles.includes(current.profile.role as Role);
  });

  useEffect(() => {
    let active = true;
    async function checkAccess() {
      const current = await getVerifiedCurrentProfile();
      if (!active) return;
      if (!current) {
        setReady(false);
        router.replace("/login");
        return;
      }
      const allowed = allowedRolesKey.split(",");
      if (!allowed.includes(current.profile.role)) {
        setReady(false);
        const destination = roleHome[current.profile.role as Role] ?? "/login";
        router.replace(destination);
        return;
      }
      setReady(true);
    }
    void checkAccess();
    return () => { active = false; };
  }, [allowedRolesKey, router]);

  if (!ready) {
    return <main className="grid min-h-screen place-items-center bg-[#f5f7f4] p-4"><p className="text-sm text-slate-500">Memeriksa akses akun…</p></main>;
  }
  return children;
}
