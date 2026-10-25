import test from "node:test";
import assert from "node:assert/strict";
import { summarizeKasCashflow } from "../lib/kas/cashflow-summary.mjs";
import { calculateCashBalance } from "../lib/kas/balance.mjs";

test("linked IPK is counted once through the cash transaction ledger", () => {
  const summary = summarizeKasCashflow([
    { jenis: "PEMASUKAN", nominal: 100, kas_ipk_id: 7 },
    { jenis: "PEMASUKAN", nominal: 50, kas_ipk_id: null },
    { jenis: "PENGELUARAN", nominal: 20, kas_ipk_id: null },
  ], [{ terkumpul: 100 }]);

  assert.deepEqual(summary, { income: 150, expenses: 20, ipkBreakdown: 100 });
  assert.equal(calculateCashBalance(1_000, summary.income, summary.expenses).closingBalance, 1_130);
});

test("a corrected linked transaction amount is reflected in the cash report", () => {
  const summary = summarizeKasCashflow(
    [{ jenis: "PEMASUKAN", nominal: 125, kas_ipk_id: 7 }],
    [{ terkumpul: 125 }],
  );

  assert.equal(summary.income, 125);
  assert.equal(summary.ipkBreakdown, 125);
  assert.equal(calculateCashBalance(500, summary.income, summary.expenses).closingBalance, 625);
});

test("a cancelled zero IPK with no linked income contributes nothing", () => {
  const summary = summarizeKasCashflow([], [{ terkumpul: 0 }]);

  assert.deepEqual(summary, { income: 0, expenses: 0, ipkBreakdown: 0 });
  assert.equal(calculateCashBalance(500, summary.income, summary.expenses).closingBalance, 500);
});

test("monthly summary excludes transactions from other periods before calculation", () => {
  const periodTransactions = [
    { tanggal: "2026-10-01", jenis: "PEMASUKAN", nominal: 100 },
    { tanggal: "2026-11-01", jenis: "PENGELUARAN", nominal: 25 },
  ].filter((row) => row.tanggal.startsWith("2026-11"));

  assert.deepEqual(summarizeKasCashflow(periodTransactions, []), {
    income: 0,
    expenses: 25,
    ipkBreakdown: 0,
  });
});
