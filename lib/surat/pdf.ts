/**
 * Final surat PDFs must be rendered by a trusted backend from the verified
 * finalization snapshot and served through private, scope-checked storage.
 * Browser-provided signer images, numbers, and resident data are not a source
 * of authority, so the former client-side jsPDF exporter is intentionally
 * disabled until that backend contract is available.
 */
export type SuratPdfRecord = {
  id: number;
  jenis_surat: string;
  status: string;
  nomor_surat: string | null;
};

export type WargaPdfRecord = {
  nama: string;
  nik: string;
  alamat: string | null;
};

export async function downloadSuratPdf(_surat: SuratPdfRecord, _warga: WargaPdfRecord): Promise<never> {
  void _surat;
  void _warga;
  throw new Error("PDF final belum tersedia melalui renderer privat backend.");
}
