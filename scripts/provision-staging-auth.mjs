import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const PROJECT_REF = "ciaxjgbpjhdhoatvqgda";
const PROJECT_URL = `https://${PROJECT_REF}.supabase.co`;
const LOGIN_SUFFIX = "@rw16.mail";
const LOGINS = [
  "ketua-rt01",
  "ketua-rt02",
  "ketua-rt03",
  "ketua-rt04",
  "ketua-rt05",
  "ketua-rt06",
  "bendahara-rw16",
  "ketua-rw16",
  "admin-rw16",
].map((alias) => `${alias}${LOGIN_SUFFIX}`);

function makePassword() {
  // 32 random bytes encoded as base64url provide 256 bits of entropy.
  return randomBytes(32).toString("base64url");
}

async function readAllUsers(client) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data) return null;
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}

async function main() {
  const secretKey = process.env.SUPABASE_STAGING_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("SUPABASE_STAGING_SECRET_KEY belum tersedia di environment proses ini.");
  }

  const client = createClient(PROJECT_URL, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  // This authenticated admin read proves that the supplied key is accepted by
  // the hard-pinned staging endpoint before any account mutation is attempted.
  // Do not include the underlying SDK error text, which could contain secrets.
  const { data: firstPage, error: verifyError } = await client.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });
  if (verifyError || !firstPage) {
    throw new Error("Target project/key verification failed; no provisioning was attempted.");
  }

  const allUsers = await readAllUsers(client);
  if (!allUsers) {
    throw new Error("Could not read Auth users; no provisioning was attempted.");
  }
  const existingByEmail = new Map(
    allUsers
      .filter((user) => user.email)
      .map((user) => [user.email.toLowerCase(), user]),
  );

  const results = [];
  for (const email of LOGINS) {
    const existing = existingByEmail.get(email);
    if (existing) {
      results.push({ email, id: existing.id });
      continue;
    }

    const { data, error } = await client.auth.admin.createUser({
      email,
      password: makePassword(),
      email_confirm: true,
    });
    if (error || !data.user?.id) {
      throw new Error("An account could not be created; credentials were not retained.");
    }
    results.push({ email, id: data.user.id });
  }

  // Re-read and report only UIDs confirmed to exist after the operation.
  const verified = await readAllUsers(client);
  if (!verified) {
    throw new Error("Could not verify resulting Auth accounts; no credentials were retained.");
  }
  const verifiedByEmail = new Map(
    verified
      .filter((user) => user.email)
      .map((user) => [user.email.toLowerCase(), user]),
  );
  for (const item of results) {
    const actual = verifiedByEmail.get(item.email);
    if (!actual || actual.id !== item.id) {
      throw new Error("Post-operation verification failed; no credentials were retained.");
    }
  }

  console.log(`Verified Auth UIDs in staging project ${PROJECT_REF}:`);
  for (const { email, id } of results) console.log(`${email}\t${id}`);
}

main().catch((error) => {
  // Avoid printing provider/SDK error detail or any request data.
  console.error(error instanceof Error ? error.message : "Provisioning failed.");
  process.exitCode = 1;
});
