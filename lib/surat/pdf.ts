export type SuratPdfRecord = {
  id: number;
  jenis_surat: string;
  keperluan: string | null;
  status: string;
  created_at: string;
  ttd_rt: boolean;
  ttd_rt_at: string | null;
  ttd_rt_nama: string | null;
  ttd_rt_gambar: string | null;
  ttd_rw: boolean;
  ttd_rw_at: string | null;
  ttd_rw_nama: string | null;
  ttd_rw_gambar: string | null;
};

export type WargaPdfRecord = {
  nama: string;
  nik: string;
  no_kk: string | null;
  alamat: string | null;
  rt: string;
};

const namaJenisSurat: Record<string, string> = {
  "surat-pengantar": "SURAT PENGANTAR",
  "surat-domisili": "SURAT KETERANGAN DOMISILI",
  "surat-keterangan-usaha": "SURAT KETERANGAN USAHA",
  "surat-keterangan-tidak-mampu": "SURAT KETERANGAN TIDAK MAMPU",
  "surat-keterangan-lainnya": "SURAT KETERANGAN",
};

function tanggalIndonesia(value: string) {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

export async function downloadSuratPdf(surat: SuratPdfRecord, warga: WargaPdfRecord) {
  if (surat.status !== "TERBIT" || !surat.ttd_rt_gambar || !surat.ttd_rw_gambar) {
    throw new Error("PDF final tersedia setelah TTD RT dan RW lengkap.");
  }

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 22;
  const right = pageWidth - left;
  const center = pageWidth / 2;
  const title = namaJenisSurat[surat.jenis_surat] ?? surat.jenis_surat.toLocaleUpperCase("id-ID");
  const year = new Date(surat.created_at).getFullYear();
  const number = `RW16/${year}/${String(surat.id).padStart(4, "0")}`;

  doc.setTextColor(25, 35, 30);
  doc.setFont("times", "bold");
  doc.setFontSize(15);
  doc.text("NUANSA INDAH CIOMAS", center, 22, { align: "center" });
  doc.setFontSize(13);
  doc.text("RUKUN WARGA 16", center, 29, { align: "center" });
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.text("Wilayah RT 01 s.d. RT 06", center, 35, { align: "center" });
  doc.setLineWidth(0.5);
  doc.line(left, 40, right, 40);
  doc.setLineWidth(0.18);
  doc.line(left, 41.5, right, 41.5);

  doc.setFont("times", "bold");
  doc.setFontSize(13);
  doc.text(title, center, 54, { align: "center" });
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.text(`Nomor: ${number}`, center, 60, { align: "center" });

  let y = 76;
  doc.setFontSize(11);
  doc.text("Yang bertanda tangan di bawah ini menerangkan bahwa:", left, y);
  y += 10;

  const rows: [string, string][] = [
    ["Nama", warga.nama],
    ["NIK", warga.nik],
    ["Nomor KK", warga.no_kk || "-"],
    ["Alamat", warga.alamat || "-"],
    ["RT / RW", `RT ${warga.rt} / RW 16`],
  ];
  for (const [label, value] of rows) {
    doc.setFont("times", "normal");
    doc.text(label, left + 4, y);
    doc.text(":", left + 34, y);
    const wrapped = doc.splitTextToSize(value, right - left - 43) as string[];
    doc.text(wrapped, left + 39, y);
    y += Math.max(7, wrapped.length * 5.5);
  }

  y += 6;
  doc.text(doc.splitTextToSize("Adalah benar warga RW 16 Nuansa Indah Ciomas. Surat keterangan ini dibuat untuk keperluan:", right - left), left, y);
  y += 12;
  doc.setFont("times", "bold");
  const reason = doc.splitTextToSize(surat.keperluan?.trim() || "Keperluan administrasi", right - left - 8) as string[];
  doc.text(reason, left + 4, y);
  y += reason.length * 6 + 8;
  doc.setFont("times", "normal");
  doc.text(doc.splitTextToSize("Demikian surat keterangan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.", right - left), left, y);

  let signatureY = Math.max(y + 24, 193);
  if (signatureY + 32 > 270) {
    doc.addPage();
    signatureY = 62;
  }
  const signatureWidth = 36;
  const signatureHeight = 20;
  const columnGap = 30;
  const columnWidth = (right - left - columnGap) / 2;
  const rtX = left + columnWidth / 2 - signatureWidth / 2;
  const rwX = left + columnWidth + columnGap + columnWidth / 2 - signatureWidth / 2;

  doc.setFontSize(10);
  doc.text(`Ciomas, ${tanggalIndonesia(surat.ttd_rw_at ?? surat.created_at)}`, center, signatureY - 13, { align: "center" });
  doc.text("Ketua RT", rtX + signatureWidth / 2, signatureY, { align: "center" });
  doc.text("Ketua RW 16", rwX + signatureWidth / 2, signatureY, { align: "center" });
  doc.addImage(surat.ttd_rt_gambar, "PNG", rtX, signatureY + 2, signatureWidth, signatureHeight, undefined, "FAST");
  doc.addImage(surat.ttd_rw_gambar, "PNG", rwX, signatureY + 2, signatureWidth, signatureHeight, undefined, "FAST");
  doc.setFont("times", "bold");
  doc.text(surat.ttd_rt_nama || "", rtX + signatureWidth / 2, signatureY + 28, { align: "center", maxWidth: columnWidth });
  doc.text(surat.ttd_rw_nama || "", rwX + signatureWidth / 2, signatureY + 28, { align: "center", maxWidth: columnWidth });
  doc.setFont("times", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 110, 105);
  doc.text("Ditandatangani secara elektronik melalui layanan administrasi RW 16.", center, signatureY + 43, { align: "center" });

  doc.save(`surat-rw16-${surat.id}.pdf`);
}
