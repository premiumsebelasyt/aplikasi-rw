import test from "node:test";
import assert from "node:assert/strict";
import { calculateCashBalance } from "../lib/kas/balance.mjs";

test("closing balance is opening plus income minus expenses", () => {
  assert.deepEqual(calculateCashBalance(1_000_000, 250_000, 100_000), {
    openingBalance: 1_000_000,
    income: 250_000,
    expenses: 100_000,
    closingBalance: 1_150_000,
  });
});

test("zero is a valid explicit opening balance", () => {
  assert.equal(calculateCashBalance(0, 50_000, 20_000).closingBalance, 30_000);
});

test("closing balance stays unknown when the opening balance is missing", () => {
  assert.equal(calculateCashBalance(null, 50_000, 20_000).closingBalance, null);
});

test("closing balance stays unknown for invalid or unsafe rupiah arithmetic", () => {
  assert.equal(calculateCashBalance(1_000_000, 10.5, 0).closingBalance, null);
  assert.equal(calculateCashBalance(Number.MAX_SAFE_INTEGER, 1, 0).closingBalance, null);
  assert.equal(calculateCashBalance(-1, 50, 20).closingBalance, null);
});
