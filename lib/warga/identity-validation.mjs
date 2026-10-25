export function isValidNIK(value) {
  return typeof value === "string" && /^\d{16}$/.test(value);
}

export function isValidOptionalNoKK(value) {
  return value == null || value === "" || (typeof value === "string" && /^\d{16}$/.test(value));
}
