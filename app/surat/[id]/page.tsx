"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Surat = {
  id: number;
  warga_id: number;
  jenis_surat: string;
  keperluan: string | null;
  rt: string;
  rw: string;
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

type Warga = {
  id: number;
  nama: string;
  nik: string;
  no_kk: string | null;
  alamat: string | null;
};

type DetailSurat = Surat & {
  warga: Warga | null;
};

export default function DetailSuratPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();

  const [surat, setSurat] = useState<DetailSurat | null>(null);
  const [loading, setLoading] = useState(true);
  const [prosesTtd, setProsesTtd] = useState(false);
  const [pesan, setPesan] = useState("");
  const [namaTtd, setNamaTtd] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const hasSignatureRef = useRef(false);

  useEffect(() => {
    ambilDetail();
  }, []);

  async function ambilDetail() {
    setLoading(true);
    setPesan("");

    try {
      const { id } = await params;
      const suratId = Number(id);

      if (!suratId) {
        throw new Error("ID surat tidak valid.");
      }

      const { data: dataSurat, error: suratError } = await supabase
        .from("surat")
        .select("*")
        .eq("id", suratId)
        .single();

      if (suratError) {
        throw suratError;
      }

      if (!dataSurat) {
        throw new Error("Surat tidak ditemukan.");
      }

      let dataWarga: Warga | null = null;

      if (dataSurat.warga_id) {
        const { data: warga, error: wargaError } = await supabase
          .from("warga")
          .select("id, nama, nik, no_kk, alamat")
          .eq("id", dataSurat.warga_id)
          .single();

        if (wargaError && wargaError.code !== "PGRST116") {
          throw wargaError;
        }

        dataWarga = warga || null;
      }

      setSurat({
        ...dataSurat,
        warga: dataWarga,
      });

      setNamaTtd(dataSurat.ttd_rt_nama || "");
    } catch (error) {
      console.error("Gagal mengambil detail surat:", error);

      if (error && typeof error === "object") {
        const err = error as {
          message?: string;
        };

        setPesan(err.message || "Gagal mengambil detail surat.");
      } else {
        setPesan(String(error));
      }
    } finally {
      setLoading(false);
    }
  }

  function setupCanvas(canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();

    const dpr =
      typeof window !== "undefined"
        ? window.devicePixelRatio || 1
        : 1;

    const width = rect.width;
    const height = 220;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
  }

  useEffect(() => {
    if (!surat) return;

    if (surat.status !== "DRAFT") return;

    if (surat.ttd_rt) return;

    const canvas = canvasRef.current;

    if (!canvas) return;

    setupCanvas(canvas);

    const handleResize = () => {
      /*
       * Jangan reset canvas kalau user sedang menggambar.
       * Untuk MVP ini canvas hanya disiapkan ulang ketika
       * ukuran layar berubah.
       */
      if (!drawingRef.current && !hasSignatureRef.current) {
        setupCanvas(canvas);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [surat]);

  function getCanvasPosition(
    event: PointerEvent<HTMLCanvasElement>
  ) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return {
        x: 0,
        y: 0,
      };
    }

    const rect = canvas.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function mulaiGambar(
    event: PointerEvent<HTMLCanvasElement>
  ) {
    if (surat?.ttd_rt) return;

    const canvas = canvasRef.current;

    if (!canvas) return;

    drawingRef.current = true;

    canvas.setPointerCapture(event.pointerId);

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const { x, y } = getCanvasPosition(event);

    ctx.beginPath();
    ctx.moveTo(x, y);

    hasSignatureRef.current = true;
  }

  function gambar(
    event: PointerEvent<HTMLCanvasElement>
  ) {
    if (!drawingRef.current) return;

    if (surat?.ttd_rt) return;

    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const { x, y } = getCanvasPosition(event);

    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function selesaiGambar(
    event: PointerEvent<HTMLCanvasElement>
  ) {
    drawingRef.current = false;

    const canvas = canvasRef.current;

    if (!canvas) return;

    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {}
  }

  function hapusTandaTangan() {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    hasSignatureRef.current = false;

    setupCanvas(canvas);
  }

  async function tandaTanganiRT() {
    if (!surat) return;

    const namaBersih = namaTtd.trim();

    if (!namaBersih) {
      setPesan(
        "Nama Ketua RT wajib diisi sebelum tanda tangan."
      );
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) {
      setPesan(
        "Kotak tanda tangan belum siap. Silakan coba lagi."
      );
      return;
    }

    if (!hasSignatureRef.current) {
      setPesan(
        "Tanda tangan belum dibuat. Silakan gambar tanda tangan pada kotak terlebih dahulu."
      );
      return;
    }

    setProsesTtd(true);
    setPesan("");

    try {
      /*
       * Canvas disimpan sebagai PNG.
       * Background canvas dibiarkan transparan sehingga
       * nantinya bisa langsung dipakai untuk PDF resmi.
       */
      const gambarTtd = canvas.toDataURL("image/png");

      const waktuTtd = new Date().toISOString();

      const { data, error } = await supabase
        .from("surat")
        .update({
          ttd_rt: true,
          ttd_rt_at: waktuTtd,
          ttd_rt_nama: namaBersih,
          ttd_rt_gambar: gambarTtd,
        })
        .eq("id", surat.id)
        .eq("status", "DRAFT")
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      setSurat({
        ...surat,
        ttd_rt: true,
        ttd_rt_at: waktuTtd,
        ttd_rt_nama: namaBersih,
        ttd_rt_gambar:
          data?.ttd_rt_gambar || gambarTtd,
      });

      setPesan(
        "Surat berhasil ditandatangani RT."
      );
    } catch (error) {
      console.error(
        "Gagal tanda tangan RT:",
        error
      );

      if (error && typeof error === "object") {
        const err = error as {
          message?: string;
        };

        setPesan(
          err.message ||
            "Gagal menyimpan tanda tangan RT."
        );
      } else {
        setPesan(String(error));
      }
    } finally {
      setProsesTtd(false);
    }
  }

  async function ajukanKeRW() {
    if (!surat) return;

    if (!surat.ttd_rt) {
      setPesan(
        "Surat harus ditandatangani RT terlebih dahulu."
      );
      return;
    }

    setProsesTtd(true);
    setPesan("");

    try {
      const { error } = await supabase
        .from("surat")
        .update({
          status: "MENUNGGU_RW",
        })
        .eq("id", surat.id)
        .eq("status", "DRAFT");

      if (error) {
        throw error;
      }

      setSurat({
        ...surat,
        status: "MENUNGGU_RW",
      });

      setPesan(
        "Surat berhasil diajukan ke RW."
      );
    } catch (error) {
      console.error(
        "Gagal mengajukan surat:",
        error
      );

      if (error && typeof error === "object") {
        const err = error as {
          message?: string;
        };

        setPesan(
          err.message ||
            "Gagal mengajukan surat ke RW."
        );
      } else {
        setPesan(String(error));
      }
    } finally {
      setProsesTtd(false);
    }
  }

  function formatJenisSurat(jenis: string) {
    const daftar: Record<string, string> = {
      "surat-pengantar": "Surat Pengantar",
      "surat-domisili": "Surat Domisili",
      "surat-keterangan-usaha":
        "Surat Keterangan Usaha",
      "surat-keterangan-tidak-mampu":
        "Surat Keterangan Tidak Mampu",
      "surat-keterangan-lainnya":
        "Surat Keterangan Lainnya",
    };

    return daftar[jenis] || jenis;
  }

  function formatStatus(status: string) {
    const daftar: Record<string, string> = {
      DRAFT: "Draft",
      MENUNGGU_RW: "Menunggu RW",
      DISETUJUI: "Disetujui",
      DITOLAK: "Ditolak",
      TERBIT: "Terbit",
    };

    return daftar[status] || status;
  }

  function warnaStatus(status: string) {
    switch (status) {
      case "DRAFT":
        return "bg-gray-100 text-gray-700";

      case "MENUNGGU_RW":
        return "bg-yellow-50 text-yellow-700";

      case "DISETUJUI":
        return "bg-green-50 text-green-700";

      case "DITOLAK":
        return "bg-red-50 text-red-700";

      case "TERBIT":
        return "bg-blue-50 text-blue-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  function formatTanggal(tanggal: string) {
    return new Date(tanggal).toLocaleDateString(
      "id-ID",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );
  }

  function formatTanggalWaktu(tanggal: string) {
    return new Date(tanggal).toLocaleString(
      "id-ID",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100">
        <div className="mx-auto max-w-xl px-4 py-10">
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-gray-500">
              Memuat detail surat...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (pesan && !surat) {
    return (
      <main className="min-h-screen bg-gray-100">
        <div className="mx-auto max-w-xl px-4 py-10">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h1 className="text-xl font-bold text-gray-800">
              Surat Tidak Ditemukan
            </h1>

            <p className="mt-2 text-sm text-red-600">
              {pesan}
            </p>

            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/surat";
              }}
              className="mt-5 w-full rounded-xl bg-gray-800 px-4 py-3 text-sm font-bold text-white"
            >
              Kembali ke Daftar Surat
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!surat) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-100 pb-10">
      <header className="bg-blue-700 px-5 py-6 text-white">
        <div className="mx-auto max-w-xl">
          <button
            type="button"
            onClick={() => {
              window.location.href =
                "/surat";
            }}
            className="text-sm font-semibold text-blue-100"
          >
            ← Kembali ke Daftar Surat
          </button>

          <p className="mt-5 text-sm text-blue-100">
            Sistem Administrasi RW 16
          </p>

          <h1 className="mt-1 text-2xl font-bold">
            Detail Surat
          </h1>

          <p className="mt-1 text-sm text-blue-100">
            Surat #{surat.id}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-5">
        {/* INFORMASI UTAMA */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-gray-400">
                JENIS SURAT
              </p>

              <h2 className="mt-1 text-xl font-bold text-gray-800">
                {formatJenisSurat(
                  surat.jenis_surat
                )}
              </h2>
            </div>

            <span
              className={
                "shrink-0 rounded-full px-3 py-1 text-xs font-bold " +
                warnaStatus(surat.status)
              }
            >
              {formatStatus(surat.status)}
            </span>
          </div>
        </div>

        {/* DATA WARGA */}
        <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800">
            Data Warga
          </h2>

          {surat.warga ? (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs text-gray-400">
                  Nama
                </p>

                <p className="mt-1 font-semibold text-gray-800">
                  {surat.warga.nama}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400">
                  NIK
                </p>

                <p className="mt-1 font-semibold text-gray-800">
                  {surat.warga.nik}
                </p>
              </div>

              {surat.warga.no_kk && (
                <div>
                  <p className="text-xs text-gray-400">
                    No. KK
                  </p>

                  <p className="mt-1 font-semibold text-gray-800">
                    {surat.warga.no_kk}
                  </p>
                </div>
              )}

              {surat.warga.alamat && (
                <div>
                  <p className="text-xs text-gray-400">
                    Alamat
                  </p>

                  <p className="mt-1 text-sm leading-5 text-gray-700">
                    {surat.warga.alamat}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-red-600">
              Data warga tidak ditemukan.
            </p>
          )}
        </div>

        {/* INFORMASI SURAT */}
        <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800">
            Informasi Surat
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400">
                RT
              </p>

              <p className="mt-1 font-semibold text-gray-800">
                RT {surat.rt}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-400">
                RW
              </p>

              <p className="mt-1 font-semibold text-gray-800">
                RW {surat.rw}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs text-gray-400">
              Tanggal Dibuat
            </p>

            <p className="mt-1 font-semibold text-gray-800">
              {formatTanggal(
                surat.created_at
              )}
            </p>
          </div>

          {surat.keperluan && (
            <div className="mt-4">
              <p className="text-xs text-gray-400">
                Keperluan
              </p>

              <div className="mt-2 rounded-xl bg-gray-50 p-4">
                <p className="text-sm leading-6 text-gray-700">
                  {surat.keperluan}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* =============================== */}
        {/* TTD RT */}
        {/* =============================== */}

        {surat.status === "DRAFT" && (
          <>
            <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">
                    Tanda Tangan RT
                  </h2>

                  <p className="mt-1 text-sm leading-5 text-gray-500">
                    Bubuhkan tanda tangan pada
                    kotak di bawah menggunakan
                    jari, stylus, atau mouse.
                  </p>
                </div>

                <span
                  className={
                    surat.ttd_rt
                      ? "rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700"
                      : "rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700"
                  }
                >
                  {surat.ttd_rt
                    ? "Sudah TTD"
                    : "Belum TTD"}
                </span>
              </div>

              {!surat.ttd_rt ? (
                <>
                  {/* CANVAS */}
                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-sm font-semibold text-gray-700">
                        Tanda Tangan
                      </label>

                      <button
                        type="button"
                        onClick={
                          hapusTandaTangan
                        }
                        disabled={
                          prosesTtd
                        }
                        className="text-xs font-bold text-red-600"
                      >
                        Hapus / Ulangi
                      </button>
                    </div>

                    <div className="overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-white">
                      <canvas
                        ref={canvasRef}
                        onPointerDown={
                          mulaiGambar
                        }
                        onPointerMove={
                          gambar
                        }
                        onPointerUp={
                          selesaiGambar
                        }
                        onPointerCancel={
                          selesaiGambar
                        }
                        onPointerLeave={
                          (event) => {
                            if (
                              drawingRef.current
                            ) {
                              gambar(event);
                            }
                          }
                        }
                        className="block h-[220px] w-full touch-none"
                      />
                    </div>

                    <p className="mt-2 text-center text-xs text-gray-400">
                      Gambar tanda tangan di
                      dalam kotak
                    </p>
                  </div>

                  {/* NAMA */}
                  <div className="mt-5">
                    <label className="text-sm font-semibold text-gray-700">
                      Nama Ketua RT
                    </label>

                    <input
                      type="text"
                      value={namaTtd}
                      onChange={(e) => {
                        setNamaTtd(
                          e.target.value
                        );
                      }}
                      placeholder="Masukkan nama Ketua RT"
                      disabled={prosesTtd}
                      className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-gray-100"
                    />
                  </div>

                  {/* SIMPAN TTD */}
                  <button
                    type="button"
                    onClick={
                      tandaTanganiRT
                    }
                    disabled={prosesTtd}
                    className="mt-4 w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {prosesTtd
                      ? "Menyimpan..."
                      : "✍️ Simpan Tanda Tangan RT"}
                  </button>
                </>
              ) : (
                <div className="mt-5 rounded-xl bg-green-50 p-4">
                  <p className="text-sm font-bold text-green-800">
                    ✓ Surat telah
                    ditandatangani RT
                  </p>

                  {surat.ttd_rt_gambar && (
                    <div className="mt-4 rounded-xl border border-green-200 bg-white p-3">
                      <img
                        src={
                          surat.ttd_rt_gambar
                        }
                        alt="Tanda tangan RT"
                        className="h-32 w-full object-contain"
                      />
                    </div>
                  )}

                  {surat.ttd_rt_nama && (
                    <p className="mt-3 text-sm text-green-700">
                      Atas nama:{" "}
                      <span className="font-bold">
                        {surat.ttd_rt_nama}
                      </span>
                    </p>
                  )}

                  {surat.ttd_rt_at && (
                    <p className="mt-1 text-xs text-green-600">
                      {formatTanggalWaktu(
                        surat.ttd_rt_at
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* AJUKAN KE RW */}
            {surat.ttd_rt && (
              <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-gray-800">
                  Pengajuan ke RW
                </h2>

                <p className="mt-1 text-sm leading-5 text-gray-500">
                  Setelah TTD RT selesai,
                  surat siap diajukan untuk
                  diperiksa dan disetujui RW.
                </p>

                <button
                  type="button"
                  onClick={
                    ajukanKeRW
                  }
                  disabled={prosesTtd}
                  className="mt-4 w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {prosesTtd
                    ? "Mengajukan..."
                    : "🚀 Ajukan ke RW"}
                </button>
              </div>
            )}
          </>
        )}

        {/* PESAN */}
        {pesan && (
          <div
            className={
              "mt-4 rounded-2xl p-4 text-sm font-semibold " +
              (pesan.includes(
                "berhasil"
              )
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700")
            }
          >
            {pesan}
          </div>
        )}

        {/* MENUNGGU RW */}
        {surat.status ===
          "MENUNGGU_RW" && (
          <>
            <div className="mt-4 rounded-2xl bg-blue-50 p-5">
              <p className="font-bold text-blue-800">
                Menunggu Persetujuan RW
              </p>

              <p className="mt-1 text-sm leading-5 text-blue-700">
                Surat sudah ditandatangani RT
                dan diajukan. Sekarang
                menunggu pemeriksaan serta
                persetujuan RW.
              </p>
            </div>

            {surat.ttd_rt_gambar && (
              <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-gray-800">
                  Tanda Tangan RT
                </h2>

                <div className="mt-4 rounded-xl border border-gray-200 bg-white p-3">
                  <img
                    src={
                      surat.ttd_rt_gambar
                    }
                    alt="Tanda tangan RT"
                    className="h-32 w-full object-contain"
                  />
                </div>

                {surat.ttd_rt_nama && (
                  <p className="mt-3 text-sm text-gray-600">
                    Ketua RT:{" "}
                    <span className="font-bold text-gray-800">
                      {
                        surat.ttd_rt_nama
                      }
                    </span>
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* DISETUJUI */}
        {surat.status ===
          "DISETUJUI" && (
          <>
            <div className="mt-4 rounded-2xl bg-green-50 p-5">
              <p className="font-bold text-green-800">
                Surat Disetujui
              </p>

              <p className="mt-1 text-sm leading-5 text-green-700">
                Surat sudah disetujui oleh RW.
              </p>
            </div>

            {surat.ttd_rt_gambar && (
              <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-gray-800">
                  Tanda Tangan RT
                </h2>

                <div className="mt-4 rounded-xl border border-gray-200 bg-white p-3">
                  <img
                    src={
                      surat.ttd_rt_gambar
                    }
                    alt="Tanda tangan RT"
                    className="h-32 w-full object-contain"
                  />
                </div>

                {surat.ttd_rt_nama && (
                  <p className="mt-3 text-sm text-gray-600">
                    Ketua RT:{" "}
                    <span className="font-bold text-gray-800">
                      {
                        surat.ttd_rt_nama
                      }
                    </span>
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* DITOLAK */}
        {surat.status ===
          "DITOLAK" && (
          <div className="mt-4 rounded-2xl bg-red-50 p-5">
            <p className="font-bold text-red-800">
              Surat Ditolak
            </p>

            <p className="mt-1 text-sm leading-5 text-red-700">
              Surat membutuhkan perbaikan
              sebelum dapat diajukan kembali.
            </p>
          </div>
        )}

        {/* TERBIT */}
        {surat.status ===
          "TERBIT" && (
          <div className="mt-4 rounded-2xl bg-blue-50 p-5">
            <p className="font-bold text-blue-800">
              Surat Telah Terbit
            </p>

            <p className="mt-1 text-sm leading-5 text-blue-700">
              Surat resmi telah diterbitkan.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}