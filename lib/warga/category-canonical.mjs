const CANONICAL_LABELS = new Map([
  ["anak", "Anak-anak"],
  ["disabilitas", "Penyandang Disabilitas"],
]);
const CATEGORY_ORDER = [
  "Lansia",
  "Balita",
  "Anak-anak",
  "Remaja",
  "Dewasa",
  "Penyandang Disabilitas",
  "Ibu Hamil",
  "Lainnya",
];

function normalizedLabel(value) {
  return typeof value === "string" ? value.trim().toLocaleLowerCase("id-ID") : "";
}

/** Canonicalize legacy labels for presentation without changing database rows. */
export function presentWargaCategories(categories, relations) {
  const rows = Array.isArray(categories) ? categories : [];
  const links = Array.isArray(relations) ? relations : [];
  const groups = new Map();

  for (const category of rows) {
    const label = CANONICAL_LABELS.get(normalizedLabel(category?.nama)) ?? category?.nama;
    if (typeof label !== "string" || !label.trim()) continue;
    const key = normalizedLabel(label);
    const existing = groups.get(key);
    const isCanonical = normalizedLabel(category.nama) === key;
    if (!existing || (isCanonical && !existing.isCanonical)) {
      groups.set(key, { category: { ...category, nama: label }, isCanonical });
    }
  }

  const categoriesById = new Map();
  for (const [key, group] of groups) {
    const ids = rows
      .filter((category) => {
        const label = CANONICAL_LABELS.get(normalizedLabel(category?.nama)) ?? category?.nama;
        return normalizedLabel(label) === key;
      })
      .map((category) => [category.id, group.category.id]);
    for (const [from, to] of ids) categoriesById.set(String(from), to);
  }

  const seenLinks = new Set();
  const canonicalRelations = [];
  for (const relation of links) {
    const kategori_id = categoriesById.get(String(relation?.kategori_id)) ?? relation?.kategori_id;
    const key = `${relation?.warga_id}:${kategori_id}`;
    if (seenLinks.has(key)) continue;
    seenLinks.add(key);
    canonicalRelations.push({ ...relation, kategori_id });
  }

  const canonicalCategories = [...groups.values()].map(({ category }) => category);
  canonicalCategories.sort((left, right) => {
    const leftIndex = CATEGORY_ORDER.indexOf(left.nama);
    const rightIndex = CATEGORY_ORDER.indexOf(right.nama);
    if (leftIndex >= 0 || rightIndex >= 0) {
      if (leftIndex < 0) return 1;
      if (rightIndex < 0) return -1;
      return leftIndex - rightIndex;
    }
    return left.nama.localeCompare(right.nama, "id-ID");
  });
  return { categories: canonicalCategories, relations: canonicalRelations };
}
