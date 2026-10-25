import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../scripts/provision-staging-auth.mjs", import.meta.url), "utf8");

test("staging provisioning is pinned to the requested project and environment secret", () => {
  assert.match(source, /const PROJECT_REF = "ciaxjgbpjhdhoatvqgda"/);
  assert.ok(source.includes('const PROJECT_URL = `https://${PROJECT_REF}.supabase.co`'));
  assert.match(source, /process\.env\.SUPABASE_STAGING_SECRET_KEY/);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY/);
});

test("provisioning covers exactly the nine internal staff aliases", () => {
  const aliases = [
    "ketua-rt01", "ketua-rt02", "ketua-rt03", "ketua-rt04", "ketua-rt05", "ketua-rt06",
    "bendahara-rw16", "ketua-rw16", "admin-rw16",
  ];
  for (const alias of aliases) assert.match(source, new RegExp(`"${alias}"`));
  assert.match(source, /const LOGIN_SUFFIX = "@rw16\.mail"/);
  assert.doesNotMatch(source, /@rw16\.invalid/);
});

test("passwords are random, never persisted or printed, and output is verified identity only", () => {
  assert.match(source, /randomBytes\(32\)\.toString\("base64url"\)/);
  assert.match(source, /password: makePassword\(\)/);
  assert.match(source, /email_confirm: true/);
  assert.match(source, /if \(!actual \|\| actual\.id !== item\.id\)/);
  assert.match(source, /console\.log\(`\$\{email\}\\t\$\{id\}`\)/);
  assert.doesNotMatch(source, /console\.log\([^\n]*password|writeFile|createWriteStream/);
});
