import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("server infers citizens by 16-digit KK and staff only by the allowlist", async () => {
  const route = await readFile(new URL("../app/api/auth/sign-in/route.ts", import.meta.url), "utf8");
  assert.match(route, /const isWarga = \/\^\\d\{16\}\$\//);
  assert.match(route, /const staffIdentity = isWarga \? null : staffLoginIdentity\(identifier\)/);
  assert.match(route, /if \(!isWarga && !staffIdentity\) return invalidCredentials\(\)/);
  assert.doesNotMatch(route, /body\.role|const role = body\.role/);
});

test("login client sends only identifier and password, stores the returned session, and redirects by verified role", async () => {
  const page = await readFile(new URL("../app/login/page.tsx", import.meta.url), "utf8");
  assert.match(page, /Username \/ Nomor KK/);
  assert.doesNotMatch(page, /Jenis akun|account-role|<select/);
  assert.match(page, /JSON\.stringify\(\{\s*identifier: formData\.get\("identifier"\),\s*password: formData\.get\("password"\),\s*\}\)/);
  assert.match(page, /supabase\.auth\.setSession\(result\.session\)/);
  assert.match(page, /router\.replace\(homeByRole\[verifiedRole\]\)/);
  assert.match(page, /Tampilkan password|Sembunyikan password/);
});

test("credential failures stay generic and never log an account or password", async () => {
  const route = await readFile(new URL("../app/api/auth/sign-in/route.ts", import.meta.url), "utf8");
  assert.match(route, /Username atau password tidak cocok/);
  assert.match(route, /Sign-in rejected at Auth stage/);
  assert.doesNotMatch(route, /console\.(?:log|warn|error)\([^\n]*(?:email|password|identifier)/i);
  assert.doesNotMatch(route, /console\.(?:log|warn|error)\([^\n]*password/i);
  assert.doesNotMatch(route, /JSON\.stringify\([^)]*password/i);
});

test("recovery no longer depends on a browser-selected role and does not email internal aliases", async () => {
  const page = await readFile(new URL("../app/login/page.tsx", import.meta.url), "utf8");
  const route = await readFile(new URL("../app/api/auth/reset-password/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(page, /role,\s*identifier:/);
  assert.match(route, /if \(!\/\^\\d\{16\}\$\/\.test\(identifier\)\) return NextResponse\.json\(\{ message: genericMessage \}\)/);
  assert.match(route, /\.eq\("role", "WARGA"\)/);
});
