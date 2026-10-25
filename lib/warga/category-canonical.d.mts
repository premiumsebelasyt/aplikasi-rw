export function presentWargaCategories(
  categories: Array<{ id: number | string; nama: string; [key: string]: unknown }>,
  relations: Array<{ warga_id: number | string; kategori_id: number | string; [key: string]: unknown }>,
): {
  categories: Array<{ id: number | string; nama: string; [key: string]: unknown }>;
  relations: Array<{ warga_id: number | string; kategori_id: number | string; [key: string]: unknown }>;
};
