export type CashBalance = {
  openingBalance: number | null;
  income: number;
  expenses: number;
  closingBalance: number | null;
};

export function calculateCashBalance(
  openingBalance: number | null,
  income: number,
  expenses: number,
): CashBalance;
