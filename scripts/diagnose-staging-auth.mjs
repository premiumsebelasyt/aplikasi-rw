import { createClient } from "@supabase/supabase-js";

const PROJECT_REF = "ciaxjgbpjhdhoatvqgda";
const PROJECT_URL = `https://${PROJECT_REF}.supabase.co`;
const LOGIN_SUFFIX = "@rw16.mail";
const ACCOUNTS = [
  { loginId: "ketua-rt01", role: "RT", rt: "01" },
  { loginId: "ketua-rt02", role: "RT", rt: "02" },
  { loginId: "ketua-rt03", role: "RT", rt: "03" },
  { loginId: "ketua-rt04", role: "RT", rt: "04" },
  { loginId: "ketua-rt05", role: "RT", rt: "05" },
  { loginId: "ketua-rt06", role: "RT", rt: "06" },
  { loginId: "bendahara-rw16", role: "BENDAHARA", rt: null },
  { loginId: "ketua-rw16", role: "RW", rt: null },
  { loginId: "admin-rw16", role: "ADMIN", rt: null },
];

function safeCode(error) {
  return typeof error?.code === "string" && /^[a-z0-9_-]{1,60}$/i.test(error.code)
    ? error.code
    : "unknown";
}

function normalizeRt(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const scope = digits.slice(-2).padStart(2, "0");
  return ["01", "02", "03", "04", "05", "06"].includes(scope) ? scope : null;
}

function report(message) {
  console.log(message);
}

async function listUsers(admin) {
  const users = [];
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data) {
      report(`AUDIT_FAILED stage=auth_user_list http=${error?.status ?? 0} code=${safeCode(error)}`);
      process.exitCode = 2;
      return null;
    }
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
  report("AUDIT_FAILED stage=auth_user_list code=pagination_limit");
  process.exitCode = 2;
  return null;
}

async function getProfiles(admin, userIds) {
  if (!userIds.length) return { profiles: new Map(), error: null };
  const { data, error } = await admin
    .from("profiles")
    .select("id, login_id, role, rt, aktif")
    .in("id", userIds);
  if (error) return { profiles: new Map(), error };
  return { profiles: new Map((data ?? []).map((profile) => [profile.id, profile])), error: null };
}

function expectedProfileState(account, profile) {
  if (!profile) return "profile_missing";
  if (profile.login_id?.trim().toLowerCase() !== account.loginId) return "login_id_mismatch";
  if (profile.role !== account.role) return "role_mismatch";
  if (account.role === "RT" && normalizeRt(profile.rt) !== account.rt) return "rt_scope_mismatch";
  if (profile.aktif !== true) return "profile_inactive";
  return "profile_verified";
}

async function main() {
  const secret = process.env.SUPABASE_STAGING_SECRET_KEY?.trim();
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!secret || !secret.startsWith("sb_secret_")) {
    report("AUDIT_FAILED stage=configuration code=rotated_staging_secret_required");
    process.exitCode = 2;
    return;
  }
  if (configuredUrl !== PROJECT_URL) {
    report("AUDIT_FAILED stage=target_verification code=project_ref_mismatch");
    process.exitCode = 2;
    return;
  }
  if (!publishableKey || !publishableKey.startsWith("sb_publishable_")) {
    report("AUDIT_FAILED stage=configuration code=staging_publishable_key_invalid");
    process.exitCode = 2;
    return;
  }

  const admin = createClient(PROJECT_URL, secret, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const users = await listUsers(admin);
  if (!users) return;

  const matchedUsers = new Map();
  for (const account of ACCOUNTS) {
    const matches = users.filter((user) => {
      const email = user.email?.trim().toLowerCase() ?? "";
      return email.split("@")[0] === account.loginId;
    });
    if (matches.length === 1) matchedUsers.set(account.loginId, matches[0]);
  }

  const { profiles, error: profilesError } = await getProfiles(
    admin,
    [...matchedUsers.values()].map((user) => user.id),
  );
  report(`TARGET_VERIFIED ref=${PROJECT_REF}`);
  if (profilesError) {
    report(`PROFILE_AUDIT_FAILED stage=profiles_read http=${profilesError.status ?? 0} code=${safeCode(profilesError)}`);
    process.exitCode = 2;
  }

  for (const account of ACCOUNTS) {
    const matches = users.filter((user) => {
      const email = user.email?.trim().toLowerCase() ?? "";
      return email.split("@")[0] === account.loginId;
    });
    if (matches.length === 0) {
      report(`${account.loginId}\tuid=missing\tauth=missing\tprofile=not_checked`);
      continue;
    }
    if (matches.length > 1) {
      report(`${account.loginId}\tuid=duplicate\tauth=duplicate_alias\tprofile=not_checked`);
      continue;
    }

    const [user] = matches;
    const emailDomain = user.email?.trim().toLowerCase().split("@")[1] ?? "";
    const authState = user.banned_until && Date.parse(user.banned_until) > Date.now()
      ? "banned"
      : user.email_confirmed_at
        ? "confirmed"
        : "unconfirmed";
    const profile = profiles.get(user.id);
    const profileState = profilesError ? "read_failed" : expectedProfileState(account, profile);
    const suffixState = emailDomain === "rw16.mail" ? "expected_alias" : "unexpected_domain";
    const role = profile?.role ?? "missing";
    const scope = profile?.rt === null || profile?.rt === undefined ? "none" : normalizeRt(profile.rt);
    report(`${account.loginId}\tuid=${user.id}\tauth=${authState}\talias=${suffixState}\tprofile=${profileState}\trole=${role}\trt=${scope}`);
  }

  const testLoginId = process.env.RW16_TEST_LOGIN_ID?.trim().toLowerCase();
  if (!testLoginId) return;
  const account = ACCOUNTS.find((item) => item.loginId === testLoginId);
  if (!account) {
    report("LOGIN_TEST_SKIPPED stage=target_check code=login_id_not_allowed");
    process.exitCode = 2;
    return;
  }
  const password = process.env.RW16_STAGING_LOGIN_PASSWORD;
  const user = matchedUsers.get(account.loginId);
  if (!password || !user || !user.email_confirmed_at || (user.banned_until && Date.parse(user.banned_until) > Date.now())) {
    report(`LOGIN_TEST_SKIPPED alias=${account.loginId} stage=precheck code=account_not_ready_or_password_missing`);
    process.exitCode = 2;
    return;
  }
  const profile = profiles.get(user.id);
  if (profilesError || expectedProfileState(account, profile) !== "profile_verified") {
    report(`LOGIN_TEST_SKIPPED alias=${account.loginId} stage=profile_precheck code=${profilesError ? safeCode(profilesError) : expectedProfileState(account, profile)}`);
    process.exitCode = 2;
    return;
  }

  const auth = createClient(PROJECT_URL, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data: signIn, error: signInError } = await auth.auth.signInWithPassword({
    email: `${account.loginId}${LOGIN_SUFFIX}`,
    password,
  });
  if (signInError || !signIn.session) {
    report(`LOGIN_TEST_FAILED alias=${account.loginId} uid=${user.id} stage=auth status=${signInError?.status ?? 0} code=${safeCode(signInError)}`);
    process.exitCode = 1;
    return;
  }

  const caller = createClient(PROJECT_URL, publishableKey, {
    global: { headers: { Authorization: `Bearer ${signIn.session.access_token}` } },
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data: verifiedProfile, error: profileError } = await caller
    .from("profiles")
    .select("id, login_id, role, rt, aktif")
    .eq("id", signIn.user.id)
    .maybeSingle();
  if (profileError) {
    report(`LOGIN_TEST_FAILED alias=${account.loginId} uid=${user.id} stage=profile_rls status=${profileError.status ?? 0} code=${safeCode(profileError)}`);
    process.exitCode = 1;
    return;
  }
  if (!verifiedProfile || expectedProfileState(account, verifiedProfile) !== "profile_verified") {
    report(`LOGIN_TEST_FAILED alias=${account.loginId} uid=${user.id} stage=profile_role code=${verifiedProfile ? expectedProfileState(account, verifiedProfile) : "profile_not_visible"}`);
    process.exitCode = 1;
    return;
  }
  report(`LOGIN_TEST_SUCCEEDED alias=${account.loginId} uid=${user.id} role=${verifiedProfile.role} rt=${normalizeRt(verifiedProfile.rt) ?? "none"} stage=auth_and_profile_rls`);
}

main().catch((error) => {
  // Never include SDK messages, request bodies, keys, sessions, or passwords.
  report(`DIAGNOSTIC_FAILED stage=internal error=${error instanceof Error ? error.name : "unknown"}`);
  process.exitCode = 2;
});
