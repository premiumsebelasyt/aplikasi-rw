/** Sum collected IPK amounts without silently displaying rounded JS integers. */
export function calculateIpkTotal(rows) {
  let total = 0;

  for (const row of rows) {
    const amount = row?.terkumpul;
    if (!Number.isSafeInteger(amount) || amount < 0) return null;

    total += amount;
    if (!Number.isSafeInteger(total)) return null;
  }

  return total;
}
