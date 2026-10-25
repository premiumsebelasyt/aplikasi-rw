/** Fail closed when PostgREST reports no error but RLS matched no row. */
export function requireMutationRow(data, error, action) {
  if (error) {
    throw new Error(`${action}: ${error.message || "operasi database gagal."}`);
  }
  if (!data) {
    throw new Error(`${action}: data tidak ditemukan atau tidak dapat diubah.`);
  }
  return data;
}
