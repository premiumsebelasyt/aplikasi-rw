/** Parse an integer rupiah amount from an unformatted or id-ID grouped input. */
export function parseKasNominal(value, allowZero = false) {
  if (typeof value !== "string" || !/^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(value)) return null;
  const digits = value.replaceAll(".", "");
  if (!digits) return null;
  const amount = Number(digits);
  return Number.isSafeInteger(amount) && (allowZero ? amount >= 0 : amount > 0) ? amount : null;
}
