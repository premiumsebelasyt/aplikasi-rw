export type KasWeekRange = { start: string; end: string };
export type KasWeekRecap = KasWeekRange & {
  openingBalance: number | null;
  income: number | null;
  expenses: number | null;
  closingBalance: number | null;
};
export function getFridayThursdayRange(now?: Date): KasWeekRange;
export function calculateWeeklyKasRecap(
  transactions: Array<{ tanggal: string; jenis: "PEMASUKAN" | "PENGELUARAN"; nominal: number }>,
  monthlyOpening: number | null,
  range: KasWeekRange,
): KasWeekRecap;
