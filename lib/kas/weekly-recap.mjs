function dateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftedDate(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 12);
}

export function getFridayThursdayRange(now = new Date()) {
  const daysSinceFriday = (now.getDay() - 5 + 7) % 7;
  const start = shiftedDate(now, -daysSinceFriday);
  const end = shiftedDate(start, 6);
  return { start: dateString(start), end: dateString(end) };
}

/** Opening amount is based on the explicit monthly opening balance for Friday's month. */
export function calculateWeeklyKasRecap(transactions, monthlyOpening, range) {
  if (!Array.isArray(transactions) || !/^\d{4}-\d{2}-\d{2}$/.test(range?.start ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(range?.end ?? "") || range.start > range.end) {
    throw new Error("Rentang rekap mingguan tidak valid.");
  }

  let income = 0n;
  let expenses = 0n;
  let beforeFriday = 0n;
  for (const row of transactions) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row?.tanggal ?? "") || !Number.isSafeInteger(row?.nominal) || row.nominal < 0) {
      throw new Error("Data transaksi mingguan tidak valid.");
    }
    const amount = BigInt(row.nominal);
    const signed = row.jenis === "PEMASUKAN" ? amount : row.jenis === "PENGELUARAN" ? -amount : null;
    if (signed === null) throw new Error("Jenis transaksi mingguan tidak valid.");
    if (row.tanggal < range.start) beforeFriday += signed;
    else if (row.tanggal <= range.end) {
      if (row.jenis === "PEMASUKAN") income += amount;
      else expenses += amount;
    }
  }

  const isSafeAmount = (value) => value >= 0n && value <= BigInt(Number.MAX_SAFE_INTEGER);
  const isSafeBalance = (value) => value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER);
  const openingExact = Number.isSafeInteger(monthlyOpening) && monthlyOpening >= 0
    ? BigInt(monthlyOpening) + beforeFriday
    : null;
  const closingExact = openingExact !== null ? openingExact + income - expenses : null;
  const openingBalance = openingExact !== null && isSafeBalance(openingExact) ? Number(openingExact) : null;
  const safeIncome = isSafeAmount(income) ? Number(income) : null;
  const safeExpenses = isSafeAmount(expenses) ? Number(expenses) : null;
  const closingBalance = closingExact !== null && isSafeBalance(closingExact) ? Number(closingExact) : null;
  return {
    start: range.start,
    end: range.end,
    openingBalance,
    income: safeIncome,
    expenses: safeExpenses,
    closingBalance,
  };
}
