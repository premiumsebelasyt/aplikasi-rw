import type { ReactNode } from "react";
import { RoleGate } from "@/components/auth/RoleGate";

export default function KasLayout({ children }: { children: ReactNode }) {
  return <RoleGate allowedRoles={["RW", "BENDAHARA", "ADMIN"]}>{children}</RoleGate>;
}
