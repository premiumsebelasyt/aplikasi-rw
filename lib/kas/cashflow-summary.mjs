/**
 * Summarize one Kas period. Cash totals come only from kas_transaksi;
 * kas_ipk is a separate breakdown and must never be added to cash income.
 */
export function summarizeKasCashflow(transactions, ipkRows) {
  const income = transactions
    .filter((row) => row.jenis === "PEMASUKAN")
    .reduce((total, row) => total + row.nominal, 0);
  const expenses = transactions
    .filter((row) => row.jenis === "PENGELUARAN")
    .reduce((total, row) => total + row.nominal, 0);
  const ipkBreakdown = ipkRows.reduce((total, row) => total + row.terkumpul, 0);

  return { income, expenses, ipkBreakdown };
}
