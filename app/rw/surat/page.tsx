"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/AppShell";
import { supabase } from "@/lib/supabase/client";
import { sendSuratCommand } from "@/lib/surat/command-client";

type SuratRow = { id: number; warga_id: number; jenis_surat: string; rt: string; payload: Record<string, unknown>; status: string; created_at: string; ttd_rt: boolean; ttd_rt_nama: string | null };
type Item = SuratRow & { warga: { nama: string; nik: string } | null };

export default function SuratRWPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) { router.replace("/login"); return; }
    const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
    if (profileError || profile?.role !== "RW") { router.replace("/login"); return; }
    const { data, error } = await supabase.from("surat").select("*").eq("status", "MENUNGGU_RW").order("created_at", { ascending: false });
    if (error) throw error;
    const rows = data ?? [];
    const wargaIds = [...new Set(rows.map((row) => row.warga_id))];
    const { data: wargaRows, error: wargaError } = wargaIds.length
      ? await supabase.from("warga").select("id, nama, nik").in("id", wargaIds)
      : { data: [], error: null };
    if (wargaError) throw wargaError;
    setItems(rows.map((row) => ({ ...row, warga: wargaRows?.find((warga) => warga.id === row.warga_id) ?? null })) as Item[]);
  }, [router]);

  useEffect(() => {
    async function loadAfterMount() {
      await Promise.resolve();
      try { await load(); }
      catch (error) { setMessage(error instanceof Error ? error.message : "Gagal memuat surat."); }
      finally { setLoading(false); }
    }
    void loadAfterMount();
  }, [load]);

  async function decide(item: Item, command: "rw_approve" | "rw_reject") {
    const reason = command === "rw_reject" ? window.prompt("Alasan surat perlu diperbaiki:") : undefined;
    if (command === "rw_reject" && reason === null) return;
    setBusyId(item.id); setMessage("");
    try {
      await sendSuratCommand(item.id, command, reason ?? undefined);
      await load();
      setMessage(command === "rw_approve" ? `Surat #${item.id} disetujui dan ditandatangani oleh signer terdaftar.` : `Surat #${item.id} dikembalikan untuk perbaikan.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Keputusan gagal disimpan."); }
    finally { setBusyId(null); }
  }

  return <main className="min-h-screen bg-[var(--background)] pb-10">
    <PageHeader eyebrow="Nuansa Indah Ciomas · RW 16" title="Surat Masuk RW" subtitle="Pemeriksaan dan persetujuan surat dari RT" />
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-5">
      <section className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs font-semibold text-slate-500">MENUNGGU PERSETUJUAN RW</p><p className="mt-1 text-3xl font-bold">{loading ? "…" : items.length}</p><p className="text-sm text-slate-500">surat telah melewati persetujuan dan TTD RT</p></section>
      {message && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{message}</p>}
      {!loading && items.length === 0 && <section className="rounded-2xl bg-white p-8 text-center"><h2 className="font-bold">Tidak ada surat masuk</h2><p className="mt-2 text-sm text-slate-500">Antrean RW kosong.</p></section>}
      {items.map((item) => <article key={item.id} className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-2"><div><p className="text-xs text-slate-500">SURAT #{item.id} · {item.rt}</p><h2 className="mt-1 font-bold">{item.jenis_surat}</h2></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">Menunggu RW</span></div>
        <p className="mt-4 text-sm"><strong>{item.warga?.nama ?? "Pemohon tidak tersedia"}</strong>{item.warga?.nik ? ` · NIK ${item.warga.nik}` : ""}</p>
        <p className="mt-2 text-sm text-slate-700">{typeof item.payload?.keperluan === "string" ? item.payload.keperluan : "—"}</p>
        <p className="mt-2 text-xs text-slate-500">TTD RT: {item.ttd_rt ? item.ttd_rt_nama ?? "Signer RT terdaftar" : "belum tercatat"} · {new Date(item.created_at).toLocaleString("id-ID")}</p>
        <button onClick={() => router.push(`/rw/surat/${item.id}`)} className="mt-4 w-full rounded-xl border p-3 text-sm font-bold">Lihat detail</button>
        <div className="mt-3 grid grid-cols-2 gap-3"><button disabled={busyId === item.id} onClick={() => void decide(item, "rw_reject")} className="rounded-xl bg-red-600 p-3 text-sm font-bold text-white disabled:opacity-50">Minta Perbaikan</button><button disabled={busyId === item.id} onClick={() => void decide(item, "rw_approve")} className="rounded-xl bg-emerald-700 p-3 text-sm font-bold text-white disabled:opacity-50">Setujui dan TTD</button></div>
      </article>)}
    </div>
  </main>;
}
