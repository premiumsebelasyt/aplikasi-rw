import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateWeeklyKasRecap, getFridayThursdayRange } from "../lib/kas/weekly-recap.mjs";

test("Friday–Thursday range includes the current Saturday and crosses months correctly", () => {
  assert.deepEqual(getFridayThursdayRange(new Date(2026, 9, 24, 12)), {
    start: "2026-10-23",
    end: "2026-10-29",
  });
  assert.deepEqual(getFridayThursdayRange(new Date(2026, 10, 1, 12)), {
    start: "2026-10-30",
    end: "2026-11-05",
  });
  assert.deepEqual(getFridayThursdayRange(new Date(2027, 0, 1, 12)), {
    start: "2027-01-01",
    end: "2027-01-07",
  });
  assert.deepEqual(getFridayThursdayRange(new Date(2027, 0, 7, 12)), {
    start: "2027-01-01",
    end: "2027-01-07",
  });
  assert.deepEqual(getFridayThursdayRange(new Date(2027, 0, 8, 12)), {
    start: "2027-01-08",
    end: "2027-01-14",
  });
  assert.deepEqual(getFridayThursdayRange(new Date(2027, 11, 31, 12)), {
    start: "2027-12-31",
    end: "2028-01-06",
  });
});

test("weekly opening and closing use Friday–Thursday ledger movements", () => {
  const result = calculateWeeklyKasRecap([
    { tanggal: "2026-10-01", jenis: "PEMASUKAN", nominal: 100 },
    { tanggal: "2026-10-20", jenis: "PENGELUARAN", nominal: 20 },
    { tanggal: "2026-10-23", jenis: "PEMASUKAN", nominal: 50 },
    { tanggal: "2026-10-24", jenis: "PENGELUARAN", nominal: 15 },
    { tanggal: "2026-10-29", jenis: "PEMASUKAN", nominal: 10 },
    { tanggal: "2026-10-30", jenis: "PEMASUKAN", nominal: 999 },
  ], 1_000, { start: "2026-10-23", end: "2026-10-29" });
  assert.deepEqual(result, {
    start: "2026-10-23",
    end: "2026-10-29",
    openingBalance: 1_080,
    income: 60,
    expenses: 15,
    closingBalance: 1_125,
  });
});

test("weekly movement remains usable but balance is unknown without a monthly opening anchor", () => {
  const result = calculateWeeklyKasRecap([
    { tanggal: "2026-10-30", jenis: "PEMASUKAN", nominal: 120 },
    { tanggal: "2026-11-02", jenis: "PENGELUARAN", nominal: 20 },
  ], null, { start: "2026-10-30", end: "2026-11-05" });
  assert.equal(result.income, 120);
  assert.equal(result.expenses, 20);
  assert.equal(result.openingBalance, null);
  assert.equal(result.closingBalance, null);
});

test("weekly recap rejects unsafe arithmetic rather than displaying rounded balances", () => {
  const result = calculateWeeklyKasRecap([
    { tanggal: "2026-10-23", jenis: "PEMASUKAN", nominal: Number.MAX_SAFE_INTEGER },
  ], 1, { start: "2026-10-23", end: "2026-10-29" });
  assert.equal(result.income, Number.MAX_SAFE_INTEGER);
  assert.equal(result.closingBalance, null);
});

test("weekly recap detects individually unsafe flow totals even when they cancel", () => {
  const result = calculateWeeklyKasRecap([
    { tanggal: "2026-10-23", jenis: "PEMASUKAN", nominal: Number.MAX_SAFE_INTEGER },
    { tanggal: "2026-10-24", jenis: "PEMASUKAN", nominal: 1 },
    { tanggal: "2026-10-25", jenis: "PENGELUARAN", nominal: Number.MAX_SAFE_INTEGER },
    { tanggal: "2026-10-26", jenis: "PENGELUARAN", nominal: 1 },
  ], 5, { start: "2026-10-23", end: "2026-10-29" });
  assert.equal(result.income, null);
  assert.equal(result.expenses, null);
  assert.equal(result.closingBalance, 5);
});

test("weekly balance arithmetic permits a verified negative ledger balance", () => {
  const result = calculateWeeklyKasRecap([
    { tanggal: "2026-10-23", jenis: "PENGELUARAN", nominal: 20 },
  ], 10, { start: "2026-10-23", end: "2026-10-29" });
  assert.equal(result.openingBalance, 10);
  assert.equal(result.closingBalance, -10);
});

test("RW dashboard reads the RW16 cash ledger and recorded monthly opening only", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /profile\.role === "RW"[\s\S]*?from\("kas_transaksi"\)/);
  assert.match(source, /from\("kas_saldo_awal"\)[\s\S]*?calculateWeeklyKasRecap/);
  assert.match(source, /Rekap Kas Jumat–Kamis/);
});
