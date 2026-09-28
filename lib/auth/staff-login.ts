const STAFF_LOGIN_SUFFIX = "@rw16.invalid";

export function staffAuthEmail(loginId: string): string | null {
  const normalized = loginId.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{2,31}$/.test(normalized)) return null;
  return `${normalized}${STAFF_LOGIN_SUFFIX}`;
}
