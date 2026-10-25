"use client";

import { useEffect, useState } from "react";
import { getVerifiedCurrentProfile } from "@/lib/auth/current-profile";
import { canManageKas, canReadKas } from "@/lib/kas/authority.mjs";

export function useKasAuthority() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getVerifiedCurrentProfile().then((current) => {
      if (active) setRole(current?.profile.role ?? null);
    });
    return () => { active = false; };
  }, []);

  return {
    role,
    canRead: canReadKas(role),
    canManage: canManageKas(role),
  };
}
