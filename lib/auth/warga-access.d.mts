export function canAccessWargaList(role: string | null | undefined): boolean;
export function canReadWarga(input: {
  role: string | null | undefined;
  profile: { rt?: unknown; no_kk?: unknown } | null | undefined;
  warga: { rt?: unknown; no_kk?: unknown } | null | undefined;
}): boolean;
export function canMutateWarga(input: {
  role: string | null | undefined;
  profile: { rt?: unknown; no_kk?: unknown } | null | undefined;
  warga: { rt?: unknown; no_kk?: unknown } | null | undefined;
  action: "create" | "update" | "delete" | string;
}): boolean;
