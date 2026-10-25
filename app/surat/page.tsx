"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/AppShell";
import { supabase } from "@/lib/supabase/client";

type SuratRow = { id: number; warga_id: number; jenis_surat: string; rt: string; payload: Record<string, unknown>; status: string; created_at: string; nomor_surat: string | null };
type Item = SuratRow & { warga: { nama: string } | null };
const statuses = ["SEMUA", "DRAFT", "MENUNGGU_RT", "DISETUJUI_RT", "MENUNGGU_RW", "DISETUJUI_RW", "PERLU_PERBAIKAN", "FINALIZING_PDF", "PDF_RETRY", "TERBIT"];
const labels: Record<string, string> = { DRAFT: "Draft", MENUNGGU_RT: "Menunggu RT", DISETUJUI_RT: "Disetujui RT", MENUNGGU_RW: "Menunggu RW", DISETUJUI_RW: "Disetujui RW · PDF menunggu", PERLU_PERBAIKAN: "Perlu perbaikan", FINALIZING_PDF: "Finalisasi PDF", PDF_RETRY: "PDF perlu dicoba ulang", TERBIT: "Terbit", DIBATALKAN: "Dibatalkan" };

export default function SuratPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [role, setRole] = useState("");
  const [filter, setFilter] = useState("SEMUA");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) { router.replace("/login"); return; }
    const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
    if (profileError || !profile) throw new Error("Profil akses akun belum tersedia.");
    if (!["WARGA", "RT", "RW", "ADMIN"].includes(profile.role)) { router.replace(profile.role === "BENDAHARA" ? "/kas" : "/login"); return; }
    const { data, error } = await supabase.from("surat").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    const rows = data ?? [];
    const wargaIds = [...new Set(rows.map((row) => row.warga_id))];
    const { data: wargaRows, error: wargaError } = wargaIds.length
      ? await supabase.from("warga").select("id, nama").in("id", wargaIds)
      : { data: [], error: null };
    if (wargaError) throw wargaError;
    setRole(profile.role);
    setItems(rows.map((row) => ({ ...row, warga: wargaRows?.find((warga) => warga.id === row.warga_id) ?? null })) as Item[]);
  }, [router]);

  useEffect(() => {
    async function loadAfterMount() {
      await Promise.resolve();
      try { await load(); }
      catch (error) { setMessage(error instanceof Error ? error.message : "Gagal mengambil data surat."); }
      finally { setLoading(false); }
    }
    void loadAfterMount();
  }, [load]);

  const shown = filter === "SEMUA" ? items : items.filter((item) => item.status === filter);
  return <main className="min-h-screen bg-[var(--background)] pb-10">
    <PageHeader eyebrow="Nuansa Indah Ciomas · RW 16" title="Arsip Surat" subtitle="Permohonan, tahapan pemeriksaan, dan status penerbitan" />
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-5">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm"><div><p className="text-sm text-slate-500">Surat dalam cakupan akses Anda</p><p className="text-3xl font-bold">{loading ? "…" : items.length}</p></div>{role === "WARGA" && <button onClick={() => router.push("/buat-surat")} className="rounded-xl bg-emerald-800 px-4 py-3 text-sm font-bold text-white">+ Buat Surat</button>}{role === "ADMIN" && <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold">Arsip baca saja</span>}</section>
      <div className="flex gap-2 overflow-x-auto pb-1">{statuses.map((status) => <button key={status} onClick={() => setFilter(status)} aria-pressed={filter === status} className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold ${filter === status ? "bg-emerald-800 text-white" : "bg-white text-slate-700"}`}>{status === "SEMUA" ? "Semua" : labels[status] ?? status}</button>)}</div>
      {message && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{message}</p>}
      {!loading && shown.length === 0 && <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">Belum ada surat pada status ini.</div>}
      {shown.map((item) => <button key={item.id} onClick={() => router.push(`/surat/${item.id}`)} className="block w-full rounded-2xl bg-white p-5 text-left shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-slate-500">SURAT #{item.id} · {item.rt}</p><h2 className="mt-1 font-bold">{item.jenis_surat}</h2><p className="mt-1 text-sm text-slate-600">{item.warga?.nama ?? "Pemohon"} · {typeof item.payload?.keperluan === "string" ? item.payload.keperluan : "Tanpa keterangan"}</p></div><span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">{labels[item.status] ?? item.status}</span></div><p className="mt-3 text-xs text-slate-500">{new Date(item.created_at).toLocaleDateString("id-ID")}{item.nomor_surat ? ` · ${item.nomor_surat}` : ""}</p></button>)}
      {role === "ADMIN" && <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-700">ADMIN hanya membaca arsip. Otoritas approval dan tanda tangan hanya dimiliki RT/RW melalui RPC sesuai wilayah dan tahap.</p>}
    </div>
  </main>;
}
