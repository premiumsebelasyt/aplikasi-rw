import test from "node:test";
import assert from "node:assert/strict";
import { canTransitionSurat } from "../lib/surat/transitions.mjs";

test("WARGA submits draft and corrected requests through RT", () => {
  assert.equal(canTransitionSurat("WARGA", "DRAFT", "MENUNGGU_RT"), true);
  assert.equal(canTransitionSurat("WARGA", "PERLU_PERBAIKAN", "MENUNGGU_RT"), true);
  assert.equal(canTransitionSurat("WARGA", "DRAFT", "TERBIT"), false);
});

test("RT can decide its pending stage and forward an approved surat", () => {
  assert.equal(canTransitionSurat("RT", "MENUNGGU_RT", "DISETUJUI_RT"), true);
  assert.equal(canTransitionSurat("RT", "MENUNGGU_RT", "PERLU_PERBAIKAN"), true);
  assert.equal(canTransitionSurat("RT", "DISETUJUI_RT", "MENUNGGU_RW"), true);
  assert.equal(canTransitionSurat("RT", "MENUNGGU_RT", "DISETUJUI_RW"), false);
});

test("RW can decide only the RW stage and cannot publish directly", () => {
  assert.equal(canTransitionSurat("RW", "MENUNGGU_RW", "DISETUJUI_RW"), true);
  assert.equal(canTransitionSurat("RW", "MENUNGGU_RW", "PERLU_PERBAIKAN"), true);
  assert.equal(canTransitionSurat("RW", "DISETUJUI_RW", "TERBIT"), false);
});

test("ADMIN, BENDAHARA and reverse/illegal transitions are denied", () => {
  for (const role of ["ADMIN", "BENDAHARA", "WARGA"]) {
    assert.equal(canTransitionSurat(role, "MENUNGGU_RW", "DISETUJUI_RW"), false);
  }
  assert.equal(canTransitionSurat("RT", "MENUNGGU_RW", "DRAFT"), false);
  assert.equal(canTransitionSurat("RW", "TERBIT", "DRAFT"), false);
});
