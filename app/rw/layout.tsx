import type { ReactNode } from "react";
import { RoleGate } from "@/components/auth/RoleGate";

export default function RWLayout({ children }: { children: ReactNode }) {
  return <RoleGate allowedRoles={["RW", "ADMIN"]}>{children}</RoleGate>;
}
