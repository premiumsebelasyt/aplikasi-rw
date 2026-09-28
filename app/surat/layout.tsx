import type { ReactNode } from "react";
import { RoleGate } from "@/components/auth/RoleGate";

export default function SuratLayout({ children }: { children: ReactNode }) {
  return <RoleGate allowedRoles={["WARGA", "RT", "RW", "ADMIN"]}>{children}</RoleGate>;
}
