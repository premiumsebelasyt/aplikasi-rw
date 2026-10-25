import test from "node:test";
import assert from "node:assert/strict";
import { canAccessWargaList, canMutateWarga, canReadWarga } from "../lib/auth/warga-access.mjs";

const ownRt = { rt: "RT 03", no_kk: null };
const rt03Warga = { rt: "03", no_kk: "1111" };
const rt04Warga = { rt: "04", no_kk: "2222" };

test("RBAC list access allows RT/RW/Admin and denies unrelated roles", () => {
  for (const role of ["RT", "RW", "ADMIN"]) assert.equal(canAccessWargaList(role), true, role);
  for (const role of ["WARGA", "BENDAHARA", "GUEST", null]) assert.equal(canAccessWargaList(role), false, String(role));
});

test("RT reads residents only within the assigned RT scope", () => {
  assert.equal(canReadWarga({ role: "RT", profile: ownRt, warga: rt03Warga }), true);
  assert.equal(canReadWarga({ role: "RT", profile: ownRt, warga: rt04Warga }), false);
  assert.equal(canReadWarga({ role: "RT", profile: { rt: null }, warga: rt03Warga }), false);
});

test("RT01 and RT02 accounts cannot read each other's resident scope", () => {
  const rt01 = { rt: "01", no_kk: null };
  const rt02 = { rt: "02", no_kk: null };
  const warga01 = { rt: "01", no_kk: "1101" };
  const warga02 = { rt: "02", no_kk: "1102" };
  assert.equal(canReadWarga({ role: "RT", profile: rt01, warga: warga01 }), true);
  assert.equal(canReadWarga({ role: "RT", profile: rt01, warga: warga02 }), false);
  assert.equal(canReadWarga({ role: "RT", profile: rt02, warga: warga02 }), true);
  assert.equal(canReadWarga({ role: "RT", profile: rt02, warga: warga01 }), false);
});

test("WARGA reads only members of their own family by KK", () => {
  assert.equal(canReadWarga({ role: "WARGA", profile: { no_kk: "1111" }, warga: { no_kk: "1111" } }), true);
  assert.equal(canReadWarga({ role: "WARGA", profile: { no_kk: "1111" }, warga: { no_kk: "2222" } }), false);
  assert.equal(canReadWarga({ role: "WARGA", profile: {}, warga: { no_kk: "1111" } }), false);
});

test("RW and Admin can read any resident while unrelated roles cannot", () => {
  assert.equal(canReadWarga({ role: "RW", profile: {}, warga: rt04Warga }), true);
  assert.equal(canReadWarga({ role: "ADMIN", profile: {}, warga: rt04Warga }), true);
  for (const role of ["BENDAHARA", "GUEST"]) assert.equal(canReadWarga({ role, profile: ownRt, warga: rt03Warga }), false);
});

test("direct ID access still applies family and RT scope", () => {
  const requestedIdRow = rt04Warga;
  assert.equal(canReadWarga({ role: "RT", profile: ownRt, warga: requestedIdRow }), false);
  assert.equal(canReadWarga({ role: "WARGA", profile: { no_kk: "1111" }, warga: { ...requestedIdRow, no_kk: "2222" } }), false);
});

test("unauthorized roles and cross-RT mutation are denied", () => {
  assert.equal(canMutateWarga({ role: "WARGA", profile: { no_kk: "1111" }, warga: rt03Warga, action: "update" }), false);
  assert.equal(canMutateWarga({ role: "BENDAHARA", profile: {}, warga: rt03Warga, action: "create" }), false);
  assert.equal(canMutateWarga({ role: "RT", profile: ownRt, warga: rt04Warga, action: "update" }), false);
  assert.equal(canMutateWarga({ role: "RT", profile: ownRt, warga: rt03Warga, action: "delete" }), false);
  assert.equal(canMutateWarga({ role: "RT", profile: ownRt, warga: null, action: "create" }), true);
  assert.equal(canMutateWarga({ role: "ADMIN", profile: {}, warga: rt04Warga, action: "update" }), true);
  assert.equal(canMutateWarga({ role: "ADMIN", profile: {}, warga: rt04Warga, action: "delete" }), false);
});
