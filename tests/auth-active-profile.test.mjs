import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isActiveProfile } from "../lib/auth/profile-status.mjs";
import { selectSupabaseAdminKey } from "../lib/supabase/admin.ts";

test("Vercel Production selects only its dedicated Supabase secret", () => {
  assert.equal(
    selectSupabaseAdminKey({
      VERCEL_ENV: "production",
      SUPABASE_SECRET_KEY: "preview-secret",
      SUPABASE_PRODUCTION_SECRET_KEY: "  production-secret  ",
    }),
    "production-secret",
  );
  assert.equal(
    selectSupabaseAdminKey({ VERCEL_ENV: "production", SUPABASE_SECRET_KEY: "preview-secret" }),
    null,
  );
  assert.equal(
    selectSupabaseAdminKey({ VERCEL_ENV: "preview", SUPABASE_SECRET_KEY: "preview-secret" }),
    "preview-secret",
  );
  assert.equal(
    selectSupabaseAdminKey({ SUPABASE_SECRET_KEY: "local-secret" }),
    "local-secret",
  );
});

test("a profile is active only when the database value is boolean true", () => {
  assert.equal(isActiveProfile({ aktif: true }), true);
  assert.equal(isActiveProfile({ aktif: false }), false);
  assert.equal(isActiveProfile({ aktif: 1 }), false);
  assert.equal(isActiveProfile({}), false);
  assert.equal(isActiveProfile(null), false);
  assert.equal(isActiveProfile(undefined), false);
});

test("server entry points select and enforce the active profile flag", async () => {
  const files = [
    ["../app/api/auth/sign-in/route.ts", /select\("id, role, rt, aktif, no_kk"\)[\s\S]*?isActiveProfile\(verifiedProfile\)[\s\S]*?staffProfileMatches\(staffIdentity, verifiedProfile\)/],
    ["../app/api/warga/route.ts", /select\("role, rt, aktif"\)[\s\S]*?isActiveProfile\(profile\)/],
    ["../app/api/warga/kategori/route.ts", /select\("role, rt, no_kk, aktif"\)[\s\S]*?isActiveProfile\(profile\)/],
    ["../app/api/auth/reset-password/route.ts", /from\("profiles"\)[\s\S]*?eq\("aktif", true\)/],
    ["../lib/auth/current-profile.ts", /no_hp, aktif"\)[\s\S]*?isActiveProfile\(profile\)/],
  ];
  for (const [path, contract] of files) {
    assert.match(await readFile(new URL(path, import.meta.url), "utf8"), contract, path);
  }
});

test("staff sign-in verifies its profile with the authenticated user JWT", async () => {
  const route = await readFile(new URL("../app/api/auth/sign-in/route.ts", import.meta.url), "utf8");
  assert.match(route, /if \(isWarga\) \{\s+const admin = createSupabaseAdmin\(\);/);
  assert.equal((route.match(/createSupabaseAdmin\(\)/g) ?? []).length, 1);
  assert.match(route, /createSupabaseUserClient\(session\.session\.access_token\)[\s\S]*?from\("profiles"\)[\s\S]*?eq\("id", session\.user\.id\)/);
});

test("legacy profile activation migration is additive and fails closed for new profiles", async () => {
  const migration = await readFile(new URL("../supabase/migrations/202610250001_profile_active_gate.sql", import.meta.url), "utf8");
  assert.match(migration, /add column aktif boolean not null default false/i);
  assert.match(migration, /u\.email_confirmed_at is not null/i);
  assert.match(migration, /u\.banned_until is null or u\.banned_until <= now\(\)/i);
  assert.match(migration, /lower\(u\.email\) = expected\.email/i);
  assert.match(migration, /p\.role = expected\.role/i);
  assert.match(migration, /p\.rt is not distinct from expected\.rt/i);
  for (const alias of ["ketua-rt01", "ketua-rt02", "ketua-rt03", "ketua-rt04", "ketua-rt05", "ketua-rt06", "bendahara-rw16", "ketua-rw16", "admin-rw16"]) {
    assert.ok(migration.includes(`${alias}@rw16.invalid`), `${alias} Production alias must be explicit`);
    assert.ok(migration.includes(`${alias}@rw16.mail`), `${alias} staging alias must be explicit`);
  }
  assert.match(migration, /if added_aktif then/i);
  assert.doesNotMatch(migration, /\b(drop|truncate|delete from)\b/i);
});
