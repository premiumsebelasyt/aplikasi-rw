import test from "node:test";
import assert from "node:assert/strict";
import { getDefaultReportPeriod, getReportPeriodRange } from "../lib/report-period.mjs";

test("monthly period covers the selected calendar month inclusively", () => {
  assert.deepEqual(getReportPeriodRange({ mode: "monthly", month: 2, year: 2024 }), {
    start: "2024-02-01", end: "2024-02-29", startMonth: "2024-02", endMonth: "2024-02",
    months: ["2024-02"], label: "Februari 2024",
  });
});

test("three-month period uses the selected month as its inclusive end", () => {
  const range = getReportPeriodRange({ mode: "three-months", month: 6, year: 2026 });
  assert.deepEqual([range.start, range.end, range.months], ["2026-04-01", "2026-06-30", ["2026-04", "2026-05", "2026-06"]]);
});

test("six-month period crosses a year boundary without dropping months", () => {
  const range = getReportPeriodRange({ mode: "six-months", month: 3, year: 2026 });
  assert.deepEqual([range.start, range.end, range.months], ["2025-10-01", "2026-03-31", ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03"]]);
});

test("yearly period covers January through December only", () => {
  const range = getReportPeriodRange({ mode: "yearly", month: 6, year: 2026 });
  assert.deepEqual([range.start, range.end, range.months.length, range.months[0], range.months.at(-1)], ["2026-01-01", "2026-12-31", 12, "2026-01", "2026-12"]);
});

test("three month period crosses into prior year when January is selected", () => {
  const range = getReportPeriodRange({ mode: "three-months", month: 1, year: 2026 });
  assert.deepEqual([range.start, range.end, range.label], ["2025-11-01", "2026-01-31", "November 2025 – Januari 2026"]);
});

test("default selection uses local month and year", () => {
  assert.deepEqual(getDefaultReportPeriod(new Date(2026, 5, 14)), { mode: "monthly", month: 6, year: 2026 });
});

test("invalid period selections fail rather than creating an incorrect range", () => {
  assert.throws(() => getReportPeriodRange({ mode: "three-months", month: 13, year: 2026 }), RangeError);
  assert.throws(() => getReportPeriodRange({ mode: "unknown", month: 1, year: 2026 }), TypeError);
});
