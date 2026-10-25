import test from "node:test";
import assert from "node:assert/strict";
import { staffAuthEmail } from "../lib/auth/staff-login.ts";

test("staff login IDs are normalized to their internal Auth address", () => {
  const stagingUrl = "https://ciaxjgbpjhdhoatvqgda.supabase.co";
  assert.equal(staffAuthEmail("  KETUA-RT01 ", stagingUrl), "ketua-rt01@rw16.mail");
  assert.equal(staffAuthEmail("  KETUA-RT01@RW16.MAIL ", stagingUrl), "ketua-rt01@rw16.mail");
  for (const loginId of [
    "ketua-rt01", "ketua-rt02", "ketua-rt03", "ketua-rt04", "ketua-rt05", "ketua-rt06",
    "bendahara-rw16", "ketua-rw16", "admin-rw16",
  ]) {
    assert.equal(staffAuthEmail(loginId, stagingUrl), `${loginId}@rw16.mail`);
  }
});

test("production aliases map to existing Auth addresses without changing Auth accounts", () => {
  const productionUrl = "https://qspglnzoayczbpgmhsnh.supabase.co";
  const aliases = [
    "ketua-rt01", "ketua-rt02", "ketua-rt03", "ketua-rt04", "ketua-rt05", "ketua-rt06",
    "bendahara-rw16", "ketua-rw16", "admin-rw16",
  ];
  for (const alias of aliases) {
    assert.equal(staffAuthEmail(alias, productionUrl), `${alias}@rw16.invalid`);
  }
  assert.equal(staffAuthEmail("ketua-rt01@rw16.mail", productionUrl), "ketua-rt01@rw16.invalid");
  assert.equal(staffAuthEmail("ketua-rt01@rw16.invalid", productionUrl), "ketua-rt01@rw16.invalid");
  assert.equal(staffAuthEmail("admin-rw16", "https://unknown.supabase.co"), null);
  assert.equal(staffAuthEmail("admin-rw16", "http://qspglnzoayczbpgmhsnh.supabase.co"), null);
});

test("staff login IDs reject malformed values and email injection", () => {
  const stagingUrl = "https://ciaxjgbpjhdhoatvqgda.supabase.co";
  for (const value of ["", "ab", "user@example.com", "admin@@rw16.mail", "admin+test", "../admin", "with space", "a".repeat(33)]) {
    assert.equal(staffAuthEmail(value, stagingUrl), null, value);
  }
});
