export function parseWargaCategoryIds(body) {
  if (!Object.hasOwn(body, "kategori_ids")) return { ids: null };
  const values = body.kategori_ids;
  if (!Array.isArray(values)) return { ids: null, error: "Daftar kategori warga tidak valid." };
  if (values.some((value) => !Number.isSafeInteger(value) || value < 1)) {
    return { ids: null, error: "Daftar kategori warga tidak valid." };
  }
  return { ids: [...new Set(values)] };
}
