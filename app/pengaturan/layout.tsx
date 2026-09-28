import type { ReactNode } from "react";
import { RoleGate } from "@/components/auth/RoleGate";

export default function PengaturanLayout({ children }: { children: ReactNode }) {
  return <RoleGate allowedRoles={["WARGA", "RT", "RW", "BENDAHARA", "ADMIN"]}>{children}</RoleGate>;
}
