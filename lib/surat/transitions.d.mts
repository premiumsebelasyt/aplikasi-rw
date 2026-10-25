export type SuratStatus = "DRAFT" | "MENUNGGU_RT" | "DISETUJUI_RT" | "MENUNGGU_RW" | "DISETUJUI_RW" | "PERLU_PERBAIKAN" | "FINALIZING_PDF" | "PDF_RETRY" | "TERBIT" | "DIBATALKAN";
export type SuratRole = "WARGA" | "RT" | "RW" | "ADMIN" | "BENDAHARA";
export function canTransitionSurat(role: SuratRole, from: SuratStatus, to: SuratStatus): boolean;
