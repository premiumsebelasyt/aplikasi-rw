import test from "node:test";
import assert from "node:assert/strict";
import { parseKasNominal } from "../lib/kas/nominal.mjs";

test("parses positive rupiah whole amounts including Indonesian grouping", () => {
  assert.equal(parseKasNominal("1500000"), 1_500_000);
  assert.equal(parseKasNominal("1.500.000"), 1_500_000);
});

test("allows an explicit zero only for opening balances", () => {
  assert.equal(parseKasNominal("0", true), 0);
  assert.equal(parseKasNominal("0"), null);
});

test("rejects empty, fractional, malformed, zero, and unsafe amounts", () => {
  for (const value of ["", "0", "1,5", "1.2", "1.2x", ".500", "9007199254740992"]) {
    assert.equal(parseKasNominal(value), null, `expected rejection for ${value}`);
  }
});
