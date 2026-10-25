import test from "node:test";
import assert from "node:assert/strict";
import { hasCompleteSuratSignatures, hasOfficialSuratNumber, hasRequiredWargaPdfData, isValidSignatureImage } from "../lib/surat/signature-validation.mjs";

test("signature images must be bounded base64 PNG or JPEG with a matching file signature", () => {
  const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/jy8AAAAASUVORK5CYII=";
  const jpeg = "data:image/jpeg;base64," + btoa(String.fromCharCode(255, 216, 255, 217));
  assert.equal(isValidSignatureImage(png), true);
  assert.equal(isValidSignatureImage(jpeg), true);
  assert.equal(isValidSignatureImage("data:image/png;base64,PGh0bWw+"), false);
  assert.equal(isValidSignatureImage("data:image/svg+xml;base64,PHN2Zz4="), false);
  assert.equal(isValidSignatureImage("data:image/png;base64," + "A".repeat(2_800_001)), false);
});

test("PDF signature completeness requires both flags, names, and timestamps", () => {
  const complete = {
    ttd_rt: true, ttd_rw: true,
    ttd_rt_nama: "Ketua RT 01", ttd_rw_nama: "Ketua RW",
    ttd_rt_at: "2026-10-01T02:00:00Z", ttd_rw_at: "2026-10-01T03:00:00Z",
  };
  assert.equal(hasCompleteSuratSignatures(complete), true);
  assert.equal(hasCompleteSuratSignatures({ ...complete, ttd_rw: false }), false);
  assert.equal(hasCompleteSuratSignatures({ ...complete, ttd_rt_nama: " " }), false);
  assert.equal(hasCompleteSuratSignatures({ ...complete, ttd_rw_at: null }), false);
  assert.equal(hasCompleteSuratSignatures({ ...complete, ttd_rw_at: "not-a-date" }), false);
});

test("PDF applicant data requires a name, NIK, and valid RW 16 RT number", () => {
  assert.equal(hasRequiredWargaPdfData({ nama: "Warga", nik: "1234567890123456", rt: "03" }), true);
  assert.equal(hasRequiredWargaPdfData({ nama: "", nik: "1234567890123456", rt: "03" }), false);
  assert.equal(hasRequiredWargaPdfData({ nama: "Warga", nik: "1234567890123456", rt: "RT 07" }), false);
});

test("PDF generation requires an assigned official number and never invents one", () => {
  assert.equal(hasOfficialSuratNumber({ nomor_surat: "Nomor resmi dari master surat" }), true);
  assert.equal(hasOfficialSuratNumber({ nomor_surat: null }), false);
  assert.equal(hasOfficialSuratNumber({ nomor_surat: "   " }), false);
  assert.equal(hasOfficialSuratNumber({ nomor_surat: "x".repeat(121) }), false);
});
