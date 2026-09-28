import type { ReactNode } from "react";
import { RoleGate } from "@/components/auth/RoleGate";

export default function WargaLayout({ children }: { children: ReactNode }) {
  return <RoleGate allowedRoles={["RT", "RW", "ADMIN"]}>{children}</RoleGate>;
}
