export function isValidSignatureImage(value: unknown): boolean;
export function hasCompleteSuratSignatures(surat: {
  ttd_rt: boolean;
  ttd_rw: boolean;
  ttd_rt_nama: string | null;
  ttd_rw_nama: string | null;
  ttd_rt_at: string | null;
  ttd_rw_at: string | null;
}): boolean;
export function hasOfficialSuratNumber(surat: { nomor_surat?: unknown }): boolean;
export function hasRequiredWargaPdfData(warga: { nama?: string | null; nik?: string | null; rt?: string | null }): boolean;
