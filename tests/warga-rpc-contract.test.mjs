import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const apiSource = await readFile(new URL("../app/api/warga/route.ts", import.meta.url), "utf8");
const adminSource = await readFile(new URL("../lib/supabase/admin.ts", import.meta.url), "utf8");
const baselineSource = await readFile(
  new URL("../supabase/candidates/202610040001_canonical_baseline.sql", import.meta.url),
  "utf8",
);

test("warga RPC uses the verified caller JWT and canonical argument contract", () => {
  assert.match(apiSource, /admin\.auth\.getUser\(token\)/);
  assert.match(apiSource, /createSupabaseUserClient\(token\)/);
  assert.equal((apiSource.match(/userClient\.rpc\("save_warga_with_categories"/g) ?? []).length, 2);
  assert.doesNotMatch(apiSource, /p_actor_id\s*:/);
  assert.match(baselineSource, /create function public\.save_warga_with_categories\(p_warga_id bigint,p_warga jsonb,p_category_ids bigint\[\]\)/);
  assert.match(baselineSource, /v_uid uuid:=auth\.uid\(\)/);
  assert.match(apiSource, /databaseErrorHttpStatus\(error\?\.code\)/);
  assert.match(apiSource, /databaseErrorHttpStatus\(updateError\.code\)/);
});

test("user RPC client forwards the access token only as a bearer session", () => {
  const userClientSource = adminSource.slice(adminSource.indexOf("export function createSupabaseUserClient"));
  assert.match(userClientSource, /createSupabaseUserClient\(accessToken: string\)/);
  assert.match(userClientSource, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(userClientSource, /Authorization: `Bearer \$\{accessToken\.trim\(\)\}`/);
  assert.doesNotMatch(userClientSource, /SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY/);
});

