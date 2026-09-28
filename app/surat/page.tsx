"use client";

import { useCallback, useEffect, useState } from "react";
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
};

type Warga = {
  id: number;
  nama: string;
  nik: string;
};

type SuratDenganWarga = Surat & {
  warga: Warga | null;
};

const daftarStatus = [
  "SEMUA",
  "DRAFT",
  "MENUNGGU_RW",
  "DISETUJUI",
  "DITOLAK",
  "TERBIT",
];

export default function SuratPage() {
  const router = useRouter();
  const [surat, setSurat] = useState<SuratDenganWarga[]>([]);
  const [filterStatus, setFilterStatus] = useState("SEMUA");
  const [loading, setLoading] = useState(true);
  const [pesan, setPesan] = useState("");

  const ambilSurat = useCallback(async () => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, no_kk, rt")
        .eq("id", authData.user.id)
        .maybeSingle();
      if (profileError || !profile) throw new Error("Profil akses akun belum tersedia.");

      let scopedWargaIds: number[] | null = null;
      if (profile.role === "WARGA") {
        if (!profile.no_kk) throw new Error("Akun belum terhubung ke KK.");
        const { data: family, error: familyError } = await supabase
          .from("warga")
          .select("id")
          .eq("no_kk", profile.no_kk);
        if (familyError) throw familyError;
        scopedWargaIds = (family ?? []).map((member) => member.id);
        if (scopedWargaIds.length === 0) {
          setSurat([]);
          setLoading(false);
          return;
        }
      } else if (profile.role === "RT" && !profile.rt) {
        throw new Error("Akun RT belum memiliki wilayah tugas.");
      } else if (!["RT", "RW", "ADMIN"].includes(profile.role)) {
        router.replace(profile.role === "BENDAHARA" ? "/kas" : "/login");
        return;
      }

      let suratQuery = supabase
        .from("surat")
        .select("*")
        .order("created_at", { ascending: false });
      suratQuery = profile.role === "WARGA"
        ? suratQuery.in("warga_id", scopedWargaIds ?? [])
        : profile.role === "RT"
          ? suratQuery.eq("rt", profile.rt)
          : suratQuery;
      const { data: dataSurat, error: suratError } = await suratQuery;

      if (suratError) {
        throw suratError;
      }

      const daftarSurat = dataSurat || [];

      if (daftarSurat.length === 0) {
        setSurat([]);
        setLoading(false);
        return;
      }

      const wargaIds = [
        ...new Set(
          daftarSurat
            .map((item) => item.warga_id)
            .filter((id) => id !== null)
        ),
      ];

      const { data: dataWarga, error: wargaError } = await supabase
        .from("warga")
        .select("id, nama, nik")
        .in("id", wargaIds);

      if (wargaError) {
        throw wargaError;
      }

      const daftarWarga = dataWarga || [];

      const hasil: SuratDenganWarga[] = daftarSurat.map((item) => ({
        ...item,
        warga:
          daftarWarga.find(
            (warga) => warga.id === item.warga_id
          ) || null,
      }));

      setSurat(hasil);
    } catch (error) {
      console.error("Gagal mengambil data surat:", error);

      if (error && typeof error === "object") {
        const err = error as {
          message?: string;
          code?: string;
        };

        setPesan(
          `Gagal mengambil data surat: ${
            err.message || "Tidak diketahui"
          }${err.code ? ` | CODE: ${err.code}` : ""}`
        );
      } else {
        setPesan(`Gagal mengambil data surat: ${String(error)}`);
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    async function loadAfterMount() {
      await Promise.resolve();
      await ambilSurat();
    }
    void loadAfterMount();
  }, [ambilSurat]);

  function formatJenisSurat(jenis: string) {
    const daftar: Record<string, string> = {
      "surat-pengantar": "Surat Pengantar",
      "surat-domisili": "Surat Domisili",
      "surat-keterangan-usaha": "Surat Keterangan Usaha",
      "surat-keterangan-tidak-mampu":
        "Surat Keterangan Tidak Mampu",
      "surat-keterangan-lainnya":
        "Surat Keterangan Lainnya",
    };

    return daftar[jenis] || jenis;
  }

  function formatStatus(status: string) {
    const daftar: Record<string, string> = {
      DRAFT: "Menunggu TTD RT",
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
        return "bg-emerald-50 text-emerald-900";

      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  function formatTanggal(tanggal: string) {
    return new Date(tanggal).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const suratTersaring =
    filterStatus === "SEMUA"
      ? surat
      : surat.filter(
          (item) => item.status === filterStatus
        );

  return (
    <main className="min-h-screen bg-gray-100 pb-10">
      <header className="bg-emerald-900 px-5 py-6 text-white">
        <div className="mx-auto max-w-xl">
          <p className="text-sm text-emerald-100">
            Sistem Administrasi RW 16
          </p>

          <h1 className="mt-1 text-2xl font-bold">
            Daftar Surat
          </h1>

          <p className="mt-1 text-sm text-emerald-100">
            Pantau seluruh surat warga
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-5">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-500">
                Total surat
              </p>

              <p className="text-3xl font-bold text-gray-800">
                {surat.length}
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/buat-surat")}
              className="rounded-xl bg-emerald-800 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-900"
            >
              + Buat Surat
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
          <p className="mb-3 text-sm font-bold text-gray-700">
            Filter Status
          </p>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {daftarStatus.map((status) => {
              const aktif = filterStatus === status;

              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilterStatus(status)}
                  className={
                    "whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition " +
                    (aktif
                      ? "bg-emerald-800 text-white"
                      : "bg-gray-100 text-gray-600")
                  }
                >
                  {status === "SEMUA"
                    ? "SEMUA"
                    : formatStatus(status)}
                </button>
              );
            })}
          </div>
        </div>

        {pesan && (
          <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            {pesan}
          </div>
        )}

        {loading ? (
          <div className="mt-4 rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-gray-500">
              Memuat daftar surat...
            </p>
          </div>
        ) : suratTersaring.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="font-semibold text-gray-700">
              Belum ada surat.
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Surat yang dibuat akan muncul di sini.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="px-1 text-sm font-semibold text-gray-500">
              Menampilkan{" "}
              <span className="text-gray-800">
                {suratTersaring.length}
              </span>{" "}
              surat
            </p>

            {suratTersaring.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-400">
                      SURAT #{item.id}
                    </p>

                    <h2 className="mt-1 text-lg font-bold text-gray-800">
                      {formatJenisSurat(item.jenis_surat)}
                    </h2>
                  </div>

                  <span
                    className={
                      "shrink-0 rounded-full px-3 py-1 text-xs font-bold " +
                      warnaStatus(item.status)
                    }
                  >
                    {formatStatus(item.status)}
                  </span>
                </div>

                <div className="mt-4 rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-semibold text-gray-400">
                    WARGA
                  </p>

                  <p className="mt-1 font-bold text-gray-800">
                    {item.warga?.nama ||
                      "Data warga tidak ditemukan"}
                  </p>

                  {item.warga?.nik && (
                    <p className="mt-1 text-xs text-gray-500">
                      NIK: {item.warga.nik}
                    </p>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400">
                      Wilayah
                    </p>

                    <p className="mt-1 text-sm font-semibold text-gray-700">
                      RT {item.rt} / RW {item.rw}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">
                      Dibuat
                    </p>

                    <p className="mt-1 text-sm font-semibold text-gray-700">
                      {formatTanggal(item.created_at)}
                    </p>
                  </div>
                </div>

                {item.keperluan && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-400">
                      Keperluan
                    </p>

                    <p className="mt-1 text-sm leading-5 text-gray-600">
                      {item.keperluan}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => router.push(`/surat/${item.id}`)}
                  className="mt-4 w-full rounded-xl bg-gray-800 px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-900"
                >
                  Lihat Detail Surat
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
