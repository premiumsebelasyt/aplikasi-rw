export type CashTransactionForSummary = {
  jenis: "PEMASUKAN" | "PENGELUARAN";
  nominal: number;
};

export type IpkRowForSummary = {
  terkumpul: number;
};

export function summarizeKasCashflow(
  transactions: CashTransactionForSummary[],
  ipkRows: IpkRowForSummary[],
): { income: number; expenses: number; ipkBreakdown: number };
