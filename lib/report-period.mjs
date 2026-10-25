const periodModes = new Set(["monthly", "three-months", "six-months", "yearly"]);

function assertSelection(selection) {
  if (!selection || !periodModes.has(selection.mode)) {
    throw new TypeError("Mode periode tidak valid.");
  }
  if (!Number.isInteger(selection.year) || selection.year < 1900 || selection.year > 2100) {
    throw new RangeError("Tahun periode tidak valid.");
  }
  if (selection.mode !== "yearly" && (!Number.isInteger(selection.month) || selection.month < 1 || selection.month > 12)) {
    throw new RangeError("Bulan periode tidak valid.");
  }
}

function dateString(year, month, day) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthKey(year, month) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

function formatMonth(year, month) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

/** Returns inclusive calendar dates and each covered month for report queries. */
export function getReportPeriodRange(selection) {
  assertSelection(selection);

  const endYear = selection.year;
  const endMonth = selection.mode === "yearly" ? 12 : selection.month;
  const monthCount = selection.mode === "monthly" ? 1
    : selection.mode === "three-months" ? 3
      : selection.mode === "six-months" ? 6
        : 12;
  const endIndex = endYear * 12 + endMonth - 1;
  const startIndex = endIndex - monthCount + 1;
  const startYear = Math.floor(startIndex / 12);
  const startMonth = (startIndex % 12) + 1;
  const finalDay = new Date(Date.UTC(endYear, endMonth, 0)).getUTCDate();
  const months = Array.from({ length: monthCount }, (_, index) => {
    const monthIndex = startIndex + index;
    return monthKey(Math.floor(monthIndex / 12), (monthIndex % 12) + 1);
  });
  const startLabel = formatMonth(startYear, startMonth);
  const endLabel = formatMonth(endYear, endMonth);

  return {
    start: dateString(startYear, startMonth, 1),
    end: dateString(endYear, endMonth, finalDay),
    startMonth: monthKey(startYear, startMonth),
    endMonth: monthKey(endYear, endMonth),
    months,
    label: startMonth === endMonth && startYear === endYear
      ? startLabel
      : `${startLabel} – ${endLabel}`,
  };
}

export function getDefaultReportPeriod(now = new Date()) {
  return {
    mode: "monthly",
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}
