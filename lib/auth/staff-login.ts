export type StaffRole = "RT" | "RW" | "BENDAHARA" | "ADMIN";

export type StaffLoginIdentity = {
  alias: string;
  role: StaffRole;
  rt: string | null;
  email: string;
};

const STAFF_ACCOUNTS = {
  "ketua-rt01": { role: "RT", rt: "01" },
  "ketua-rt02": { role: "RT", rt: "02" },
  "ketua-rt03": { role: "RT", rt: "03" },
  "ketua-rt04": { role: "RT", rt: "04" },
  "ketua-rt05": { role: "RT", rt: "05" },
  "ketua-rt06": { role: "RT", rt: "06" },
  "bendahara-rw16": { role: "BENDAHARA", rt: null },
  "ketua-rw16": { role: "RW", rt: null },
  "admin-rw16": { role: "ADMIN", rt: null },
} as const satisfies Record<string, { role: StaffRole; rt: string | null }>;

const ACCEPTED_LOGIN_SUFFIXES = ["@rw16.mail", "@rw16.invalid"] as const;
const AUTH_SUFFIX_BY_PROJECT_REF: Record<string, "@rw16.mail" | "@rw16.invalid"> = {
  ciaxjgbpjhdhoatvqgda: "@rw16.mail",
  qspglnzoayczbpgmhsnh: "@rw16.invalid",
};

export function normalizeStaffAlias(loginId: string): string | null {
  const normalized = loginId.trim().toLowerCase();
  const suffix = ACCEPTED_LOGIN_SUFFIXES.find((candidate) => normalized.endsWith(candidate));
  const alias = suffix ? normalized.slice(0, -suffix.length) : normalized;
  return Object.hasOwn(STAFF_ACCOUNTS, alias) ? alias : null;
}

export function staffLoginIdentity(
  loginId: string,
  projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
): StaffLoginIdentity | null {
  const alias = normalizeStaffAlias(loginId);
  if (!alias) return null;

  let projectRef: string;
  try {
    const url = new URL(projectUrl ?? "");
    const match = /^([a-z0-9]+)\.supabase\.co$/i.exec(url.hostname);
    if (url.protocol !== "https:" || !match || url.port || url.username || url.password) return null;
    projectRef = match[1].toLowerCase();
  } catch {
    return null;
  }

  const suffix = AUTH_SUFFIX_BY_PROJECT_REF[projectRef];
  const account = STAFF_ACCOUNTS[alias as keyof typeof STAFF_ACCOUNTS];
  if (!suffix || !account) return null;

  return { alias, ...account, email: `${alias}${suffix}` };
}

export function staffAuthEmail(
  loginId: string,
  projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
): string | null {
  return staffLoginIdentity(loginId, projectUrl)?.email ?? null;
}

export function staffProfileMatches(
  identity: Pick<StaffLoginIdentity, "role" | "rt">,
  profile: { role?: unknown; rt?: unknown; aktif?: unknown } | null,
): boolean {
  if (!profile || profile.aktif !== true || profile.role !== identity.role) return false;
  return identity.role === "RT" ? profile.rt === identity.rt : profile.rt == null;
}
