const ACCEPTED_LOGIN_SUFFIXES = ["@rw16.mail", "@rw16.invalid"] as const;

const AUTH_SUFFIX_BY_PROJECT_REF: Record<string, "@rw16.mail" | "@rw16.invalid"> = {
  ciaxjgbpjhdhoatvqgda: "@rw16.mail",
  qspglnzoayczbpgmhsnh: "@rw16.invalid",
};

export function staffAuthEmail(
  loginId: string,
  projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
): string | null {
  const normalized = loginId.trim().toLowerCase();
  const inputSuffix = ACCEPTED_LOGIN_SUFFIXES.find((suffix) => normalized.endsWith(suffix));
  const alias = inputSuffix ? normalized.slice(0, -inputSuffix.length) : normalized;
  if (!/^[a-z0-9][a-z0-9-]{2,31}$/.test(alias)) return null;

  let projectRef: string;
  try {
    const url = new URL(projectUrl ?? "");
    const match = /^([a-z0-9]+)\.supabase\.co$/i.exec(url.hostname);
    if (url.protocol !== "https:" || !match || url.port || url.username || url.password) return null;
    projectRef = match[1].toLowerCase();
  } catch {
    return null;
  }

  const authSuffix = AUTH_SUFFIX_BY_PROJECT_REF[projectRef];
  return authSuffix ? `${alias}${authSuffix}` : null;
}
