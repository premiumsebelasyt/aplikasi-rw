/**
 * Kas RW uses an explicitly recorded opening balance for each month.
 * We do not infer/carry it from the previous month. Without it, the closing
 * balance is unknown even when the month's net movement can be calculated.
 * @param {number | null} openingBalance
 * @param {number} income
 * @param {number} expenses
 */
export function calculateCashBalance(openingBalance, income, expenses) {
  const validOpening = openingBalance === null || (Number.isSafeInteger(openingBalance) && openingBalance >= 0);
  const validMovements = [income, expenses].every((amount) => Number.isSafeInteger(amount) && amount >= 0);
  const closingBalance = validOpening && validMovements && openingBalance !== null
    ? openingBalance + income - expenses
    : null;
  return {
    openingBalance,
    income,
    expenses,
    closingBalance: Number.isSafeInteger(closingBalance) ? closingBalance : null,
  };
}
