export function normalizeRtScope(value: unknown): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const rt = digits.slice(-2).padStart(2, "0");
  return ["01", "02", "03", "04", "05", "06"].includes(rt) ? rt : null;
}
