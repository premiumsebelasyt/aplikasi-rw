import test from "node:test";
import assert from "node:assert/strict";
import { normalizeStaffAlias, staffAuthEmail, staffLoginIdentity, staffProfileMatches } from "../lib/auth/staff-login.ts";

const productionUrl = "https://qspglnzoayczbpgmhsnh.supabase.co";
const stagingUrl = "https://ciaxjgbpjhdhoatvqgda.supabase.co";
const expected = [
  ["ketua-rt01", "RT", "01"],
  ["ketua-rt02", "RT", "02"],
  ["ketua-rt03", "RT", "03"],
  ["ketua-rt04", "RT", "04"],
  ["ketua-rt05", "RT", "05"],
  ["ketua-rt06", "RT", "06"],
  ["bendahara-rw16", "BENDAHARA", null],
  ["ketua-rw16", "RW", null],
  ["admin-rw16", "ADMIN", null],
];

test("all nine known Production staff usernames map to their Auth emails and role scopes", () => {
  for (const [alias, role, rt] of expected) {
    assert.deepEqual(staffLoginIdentity(alias, productionUrl), {
      alias,
      role,
      rt,
      email: `${alias}@rw16.invalid`,
    });
  }
});

test("staging uses its existing internal Auth suffix while Production keeps .invalid", () => {
  assert.equal(staffAuthEmail("ketua-rt01", stagingUrl), "ketua-rt01@rw16.mail");
  assert.equal(staffAuthEmail("ketua-rt01", productionUrl), "ketua-rt01@rw16.invalid");
});

test("usernames normalize whitespace, case, and known alias suffixes", () => {
  assert.equal(normalizeStaffAlias("  KETUA-RT01  "), "ketua-rt01");
  assert.equal(normalizeStaffAlias("  KETUA-RT01@RW16.MAIL  "), "ketua-rt01");
  assert.equal(staffAuthEmail("  KETUA-RT01@RW16.INVALID  ", productionUrl), "ketua-rt01@rw16.invalid");
});

test("unknown aliases and unsafe project URLs are rejected", () => {
  for (const value of ["", "ab", "user@example.com", "admin+test", "../admin", "ketua-rt07", "root"]) {
    assert.equal(staffLoginIdentity(value, productionUrl), null, value);
  }
  assert.equal(staffLoginIdentity("admin-rw16", "https://unknown.supabase.co"), null);
  assert.equal(staffLoginIdentity("admin-rw16", "http://qspglnzoayczbpgmhsnh.supabase.co"), null);
});

test("verified database profile role and RT scope must match the staff username", () => {
  const rt01 = staffLoginIdentity("ketua-rt01", productionUrl);
  assert.equal(staffProfileMatches(rt01, { role: "RT", rt: "01", aktif: true }), true);
  assert.equal(staffProfileMatches(rt01, { role: "RT", rt: "02", aktif: true }), false);
  assert.equal(staffProfileMatches(rt01, { role: "RW", rt: null, aktif: true }), false);
  assert.equal(staffProfileMatches(rt01, { role: "RT", rt: "01", aktif: false }), false);
  assert.equal(staffProfileMatches(staffLoginIdentity("ketua-rw16", productionUrl), { role: "RW", rt: null, aktif: true }), true);
});
