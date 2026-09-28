import type { ReactNode } from "react";
import { RoleGate } from "@/components/auth/RoleGate";

export default function BuatSuratLayout({ children }: { children: ReactNode }) {
  return <RoleGate allowedRoles={["WARGA"]}>{children}</RoleGate>;
}
