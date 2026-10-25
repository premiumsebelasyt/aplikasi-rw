import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("public signup fails closed until out-of-band household provisioning exists", async () => {
  const route = await readFile(new URL("../app/api/auth/sign-up/route.ts", import.meta.url), "utf8");
  assert.match(route, /Pendaftaran mandiri belum tersedia/);
  assert.match(route, /status:\s*503/);
  assert.doesNotMatch(route, /auth\.signUp|admin\.createUser|provision_warga_profile/);
});

test("login form does not send a password for an unavailable self-signup flow", async () => {
  const page = await readFile(new URL("../app/login/page.tsx", import.meta.url), "utf8");
  assert.match(page, /Tidak ada akun yang dibuat/);
  assert.doesNotMatch(page, /fetch\("\/api\/auth\/sign-up"/);
  assert.match(page, /if \(mode === "register"\)[\s\S]*?return;/);
});
