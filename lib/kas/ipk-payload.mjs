const REQUIRED_RT = ["01", "02", "03", "04", "05", "06"];

export function buildIpkRpcPayload(month, rows, monthLabel) {
  if (typeof month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error("Bulan IPK tidak valid.");
  }
  if (typeof monthLabel !== "string" || !monthLabel.trim()) {
    throw new Error("Label bulan IPK tidak valid.");
  }
  if (!Array.isArray(rows) || rows.length !== REQUIRED_RT.length) {
    throw new Error("IPK harus berisi tepat enam RT.");
  }

  const byRt = new Map();
  for (const row of rows) {
    if (!REQUIRED_RT.includes(row?.rt) || byRt.has(row.rt)) {
      throw new Error("Setiap RT 01 sampai 06 harus tercantum satu kali.");
    }
    if (!Number.isSafeInteger(row.terkumpul) || row.terkumpul < 0) {
      throw new Error(`Nilai IPK RT ${row.rt} harus berupa angka bulat nol atau lebih.`);
    }
    byRt.set(row.rt, row.terkumpul);
  }

  if (REQUIRED_RT.some((rt) => !byRt.has(rt))) {
    throw new Error("Setiap RT 01 sampai 06 harus tercantum satu kali.");
  }
  const total = REQUIRED_RT.reduce((sum, rt) => sum + byRt.get(rt), 0);
  if (!Number.isSafeInteger(total)) {
    throw new Error("Total IPK harus berada dalam batas angka rupiah yang aman.");
  }

  return {
    p_bulan: `${month}-01`,
    p_rows: REQUIRED_RT.map((rt) => ({
      rt,
      terkumpul: byRt.get(rt),
      keterangan: `IPK Bulanan RT ${rt} - ${monthLabel.trim()}`,
    })),
  };
}
