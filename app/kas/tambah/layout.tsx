import type { ReactNode } from "react";
import { RoleGate } from "@/components/auth/RoleGate";

export default function TambahKasLayout({ children }: { children: ReactNode }) {
  return <RoleGate allowedRoles={["BENDAHARA", "ADMIN"]}>{children}</RoleGate>;
}
