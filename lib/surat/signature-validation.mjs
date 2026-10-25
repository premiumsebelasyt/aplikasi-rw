import { isValidNIK } from "../warga/identity-validation.mjs";

const MAX_SIGNATURE_DATA_URL_LENGTH = 2_800_000;

export function isValidSignatureImage(value) {
  if (typeof value !== "string" || value.length > MAX_SIGNATURE_DATA_URL_LENGTH) return false;
  const match = /^data:image\/(png|jpeg);base64,((?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?)$/i.exec(value);
  if (!match || !match[2]) return false;
  try {
    const bytes = atob(match[2]);
    if (match[1].toLowerCase() === "png") {
      return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes.charCodeAt(index) === byte);
    }
    return bytes.length >= 3 && bytes.charCodeAt(0) === 255 && bytes.charCodeAt(1) === 216 && bytes.charCodeAt(2) === 255;
  } catch {
    return false;
  }
}

export function hasCompleteSuratSignatures(surat) {
  return surat.ttd_rt === true
    && surat.ttd_rw === true
    && Boolean(surat.ttd_rt_nama?.trim())
    && Boolean(surat.ttd_rw_nama?.trim())
    && Number.isFinite(Date.parse(surat.ttd_rt_at ?? ""))
    && Number.isFinite(Date.parse(surat.ttd_rw_at ?? ""));
}

export function hasOfficialSuratNumber(surat) {
  return typeof surat?.nomor_surat === "string"
    && surat.nomor_surat.trim().length > 0
    && surat.nomor_surat.trim().length <= 120;
}

export function hasRequiredWargaPdfData(warga) {
  return Boolean(warga?.nama?.trim())
    && isValidNIK(warga?.nik)
    && /^(0[1-6]|RT 0[1-6])$/i.test(warga?.rt?.trim() ?? "");
}

