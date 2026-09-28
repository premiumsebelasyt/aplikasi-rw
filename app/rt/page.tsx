"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { normalizeRtScope } from "@/lib/warga/rt-scope";
import { ambilDataWarga } from "@/lib/warga/data";

type Warga = {
  id: number;
  no_kk: string | null;
  nama: string;
  rt: string;
  jenis_kelamin: string | null;
  status_warga: string | null;
};

type StatistikRT = {
  rt: string;
  total: number;
  laki: number;
  perempuan: number;
  kk: number;
  aktif: number;
};

const daftarRT = ["01", "02", "03", "04", "05", "06"];

export default function RTPage() {
  const router = useRouter();
  const [warga, setWarga] = useState<Warga[]>([]);
  const [rtAkun, setRtAkun] = useState("");
  const [suratMenunggu, setSuratMenunggu] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pesan, setPesan] = useState("");
  const [isRtAccount, setIsRtAccount] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadRT() {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !authData.user) {
        router.replace("/login");
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, rt")
        .eq("id", authData.user.id)
        .maybeSingle();
      if (!active) return;
      if (profileError || !profile) {
        setPesan("Profil akses akun belum tersedia.");
        setLoading(false);
        return;
      }
      if (!["RT", "RW", "ADMIN"].includes(profile.role) || (profile.role === "RT" && !profile.rt)) {
        const destination = profile.role === "RW" || profile.role === "ADMIN" ? "/" : profile.role === "BENDAHARA" ? "/kas" : profile.role === "WARGA" ? "/" : "/login";
        router.replace(destination);
        return;
      }
      setIsRtAccount(profile.role === "RT");
      const rt = profile.role === "RT" ? normalizeRtScope(profile.rt) : "";
      if (profile.role === "RT" && !rt) {
        setPesan("Akun RT belum memiliki wilayah tugas yang valid.");
        setLoading(false);
        return;
      }
      let scopedWarga: Warga[];
      try {
        const result = await ambilDataWarga<Warga>();
        scopedWarga = result.warga;
      } catch (error) {
        setPesan(error instanceof Error ? error.message : "Data warga gagal dimuat.");
        setLoading(false);
        return;
      }
      const inboxResult = profile.role === "RT" ? await supabase
          .from("surat")
          .select("id", { count: "exact", head: true })
          .eq("rt", rt)
          .eq("status", "DRAFT") : { count: 0, error: null };
      if (!active) return;
      setRtAkun(rt || "01–06");
      setWarga(scopedWarga);
      if (!inboxResult.error) setSuratMenunggu(inboxResult.count ?? 0);
      setLoading(false);
    }
    void loadRT();
    return () => { active = false; };
  }, [router]);

  function normalisasiRT(rt: string | null) {
    if (!rt) return "";

    return String(rt).padStart(2, "0");
  }

  function statistikRT(rt: string): StatistikRT {
    const dataRT = warga.filter(
      (item) => normalisasiRT(item.rt) === rt
    );

    const laki = dataRT.filter(
      (item) => item.jenis_kelamin === "L"
    ).length;

    const perempuan = dataRT.filter(
      (item) => item.jenis_kelamin === "P"
    ).length;

    const daftarKK = new Set(
      dataRT
        .map((item) => item.no_kk)
        .filter(
          (noKK): noKK is string =>
            Boolean(noKK && noKK.trim())
        )
    );

    const aktif = dataRT.filter(
      (item) =>
        !item.status_warga ||
        item.status_warga === "Aktif"
    ).length;

    return {
      rt,
      total: dataRT.length,
      laki,
      perempuan,
      kk: daftarKK.size,
      aktif,
    };
  }

  const statistik = daftarRT.map(statistikRT);
  const statistikTampil = isRtAccount
    ? statistik.filter((item) => item.rt === rtAkun)
    : statistik;

  const totalWarga = statistik.reduce(
    (total, item) => total + item.total,
    0
  );

  const totalKK = statistik.reduce(
    (total, item) => total + item.kk,
    0
  );

  const totalLaki = statistik.reduce(
    (total, item) => total + item.laki,
    0
  );

  const totalPerempuan = statistik.reduce(
    (total, item) => total + item.perempuan,
    0
  );

  const totalAktif = statistik.reduce(
    (total, item) => total + item.aktif,
    0
  );

  function lihatWarga(rt: string) {
    router.push(`/warga?rt=${rt}`);
  }

  return (
    <main className="min-h-screen bg-[#f5f7f4] pb-10">
      <header className="bg-emerald-900 px-5 py-6 text-white">
        <div className="mx-auto max-w-xl">
          <p className="text-sm text-emerald-100">
            Nuansa Indah Ciomas
          </p>

          <h1 className="mt-1 text-2xl font-bold">
            Data RT {rtAkun}
          </h1>

          <p className="mt-1 text-sm text-emerald-100">
            RW 16 · Wilayah tugas RT {rtAkun}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-5">

        <Link href="/surat" className="mb-4 flex min-h-14 items-center justify-between rounded-2xl bg-white px-5 font-semibold text-slate-800 shadow-sm ring-1 ring-emerald-100">
          <span className="flex items-center gap-2">Inbox surat masuk RT {rtAkun}{suratMenunggu > 0 && <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">{suratMenunggu > 9 ? "9+" : suratMenunggu} baru</span>}</span><span aria-hidden="true" className="text-emerald-900">→</span>
        </Link>

        {/* RINGKASAN */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-600">
            Ringkasan RW 16
          </p>

          {loading ? (
            <p className="mt-4 text-sm text-gray-500">
              Memuat data...
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-xs font-semibold text-emerald-800">
                  Total Warga
                </p>

                <p className="mt-1 text-2xl font-bold text-emerald-900">
                  {totalWarga}
                </p>
              </div>

              <div className="rounded-2xl bg-green-50 p-4">
                <p className="text-xs font-semibold text-green-600">
                  Total KK
                </p>

                <p className="mt-1 text-2xl font-bold text-green-800">
                  {totalKK}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-semibold text-gray-600">
                  Laki-laki
                </p>

                <p className="mt-1 text-2xl font-bold text-gray-800">
                  {totalLaki}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-semibold text-gray-600">
                  Perempuan
                </p>

                <p className="mt-1 text-2xl font-bold text-gray-800">
                  {totalPerempuan}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ERROR */}
        {pesan && (
          <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-600">
            {pesan}
          </div>
        )}

        {/* DAFTAR RT */}
        <div className="mt-4">
          <div className="mb-3 px-1">
            <h2 className="font-bold text-gray-800">
              Daftar RT
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Statistik otomatis berdasarkan data warga RW 16
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
              <p className="text-sm text-gray-500">
                Memuat data RT...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {statistikTampil.map((item) => (
                <div
                  key={item.rt}
                  className="rounded-2xl bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">
                        RW 16
                      </p>

                      <h3 className="mt-1 text-xl font-bold text-gray-800">
                        RT {item.rt}
                      </h3>
                    </div>

                    <div className="rounded-xl bg-emerald-50 px-3 py-2 text-right">
                      <p className="text-xs text-emerald-800">
                        Warga
                      </p>

                      <p className="text-xl font-bold text-emerald-900">
                        {item.total}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">
                        KK
                      </p>

                      <p className="mt-1 font-bold text-gray-800">
                        {item.kk}
                      </p>
                    </div>

                    <div className="rounded-xl bg-green-50 p-3">
                      <p className="text-xs text-green-600">
                        Aktif
                      </p>

                      <p className="mt-1 font-bold text-green-700">
                        {item.aktif}
                      </p>
                    </div>

                    <div className="rounded-xl bg-emerald-50 p-3">
                      <p className="text-xs text-emerald-800">
                        Laki-laki
                      </p>

                      <p className="mt-1 font-bold text-emerald-900">
                        {item.laki}
                      </p>
                    </div>

                    <div className="rounded-xl bg-pink-50 p-3">
                      <p className="text-xs text-pink-600">
                        Perempuan
                      </p>

                      <p className="mt-1 font-bold text-pink-700">
                        {item.perempuan}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => lihatWarga(item.rt)}
                    className="mt-4 w-full rounded-xl bg-emerald-800 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-900"
                  >
                    Lihat Warga RT {item.rt}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* TOTAL AKTIF */}
        {!loading && (
          <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Total warga aktif
            </p>

            <p className="mt-1 text-3xl font-bold text-green-600">
              {totalAktif}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Data dihitung langsung dari tabel warga.
            </p>
          </div>
        )}

        {/* KEMBALI */}
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-5 w-full rounded-xl bg-gray-800 px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-900"
        >
          ← Kembali ke Dashboard
        </button>
      </div>
    </main>
  );
}
