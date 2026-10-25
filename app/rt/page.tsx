"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { DashboardIntro, DashboardLayout } from "@/components/ui/AppShell";
import { SectionHeading, StatCard } from "@/components/ui/MobileAppUI";
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
        const destination = profile.role === "RW" ? "/" : profile.role === "ADMIN" ? "/menu" : profile.role === "BENDAHARA" ? "/kas" : profile.role === "WARGA" ? "/" : "/login";
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
          .eq("status", "MENUNGGU_RT") : { count: 0, error: null };
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
    <DashboardLayout
      eyebrow="RW 16 · Pelayanan Warga"
      title="Dashboard Ketua RT"
      subtitle={`Wilayah tugas RT ${rtAkun}`}
    >
      <DashboardIntro eyebrow="Ketua RT" title={`RT ${rtAkun}`} description="Ringkasan tugas dan layanan wilayah" />

        <Link href="/surat" className="mb-4 flex min-h-14 items-center justify-between rounded-2xl bg-white px-5 font-semibold text-slate-800 shadow-sm ring-1 ring-emerald-100">
          <span className="flex items-center gap-2">Inbox surat masuk RT {rtAkun}{suratMenunggu > 0 && <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">{suratMenunggu > 9 ? "9+" : suratMenunggu} baru</span>}</span><span aria-hidden="true" className="text-emerald-900">→</span>
        </Link>

        {/* RINGKASAN */}
        <section aria-label="Ringkasan wilayah">
          <SectionHeading title="Ringkasan wilayah" />
          {loading ? <p role="status" className="type-helper rounded-2xl border border-[var(--border)] bg-white p-4 text-slate-600">Memuat data wilayah…</p> : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Total warga" value={totalWarga} icon="users" />
              <StatCard label="Total KK" value={totalKK} icon="family" tone="blue" />
              <StatCard label="Laki-laki" value={totalLaki} icon="user" tone="cyan" />
              <StatCard label="Perempuan" value={totalPerempuan} icon="user" tone="rose" />
            </div>
          )}
        </section>

        {/* ERROR */}
        {pesan && (
          <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-600">
            {pesan}
          </div>
        )}

        {/* DAFTAR RT */}
        <section>
          <SectionHeading title={isRtAccount ? "Ringkasan RT" : "Ringkasan per RT"} />

          {loading ? (
            <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
              <p className="text-sm text-gray-500">
                Memuat data RT...
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
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
        </section>

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

    </DashboardLayout>
  );
}
