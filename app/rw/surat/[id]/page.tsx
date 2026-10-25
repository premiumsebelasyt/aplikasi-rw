"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/AppShell";
import { supabase } from "@/lib/supabase/client";
import { sendSuratCommand } from "@/lib/surat/command-client";

type SuratRow = {
  id: number;
  warga_id: number;
  jenis_surat: string;
  rt: string;
  payload: Record<string, unknown>;
  status: string;
  created_at: string;
  nomor_surat: string | null;
  ditolak_alasan: string | null;
  ttd_rt: boolean;
  ttd_rt_nama: string | null;
  ttd_rw: boolean;
  ttd_rw_nama: string | null;
};
type WargaRow = { nama: string; nik: string; alamat: string | null };
type HistoryRow = { id: number; action: string; from_status: string | null; to_status: string | null; occurred_at: string };

export default function DetailSuratRW() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);
  const [surat, setSurat] = useState<SuratRow | null>(null);
  const [warga, setWarga] = useState<WargaRow | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) { router.replace("/login"); return; }
    const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
    if (profileError || profile?.role !== "RW") { router.replace("/login"); return; }
    const { data, error } = await supabase.from("surat").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Surat tidak ditemukan atau tidak dapat diakses.");
    const { data: resident, error: residentError } = await supabase.from("warga").select("nama, nik, alamat").eq("id", data.warga_id).maybeSingle();
    if (residentError) throw residentError;
    const { data: events, error: historyError } = await supabase.from("surat_history").select("id, action, from_status, to_status, occurred_at").eq("surat_id", id).order("occurred_at", { ascending: true });
    if (historyError) throw historyError;
    setSurat(data as SuratRow);
    setWarga(resident);
    setHistory(events ?? []);
  }, [id, router]);

  useEffect(() => {
    let active = true;
    async function loadAfterMount() {
      await Promise.resolve();
      if (!Number.isSafeInteger(id) || id < 1) { setMessage("ID surat tidak valid."); setLoading(false); return; }
      try { await load(); }
      catch (error) { if (active) setMessage(error instanceof Error ? error.message : "Gagal memuat surat."); }
      finally { if (active) setLoading(false); }
    }
    void loadAfterMount();
    return () => { active = false; };
  }, [id, load]);

  async function decide(command: "rw_approve" | "rw_reject") {
    if (!surat || busy) return;
    const reason = command === "rw_reject" ? window.prompt("Alasan surat perlu diperbaiki:") : undefined;
    if (command === "rw_reject" && reason === null) return;
    setBusy(true); setMessage("");
    try {
      await sendSuratCommand(surat.id, command, reason ?? undefined);
      setMessage(command === "rw_approve" ? "Persetujuan RW dan tanda tangan terdaftar berhasil dicatat. PDF menunggu finalisasi backend." : "Surat dikembalikan untuk perbaikan.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Keputusan surat gagal disimpan.");
    } finally { setBusy(false); }
  }

  if (loading) return <main className="min-h-screen bg-[var(--background)]"><PageHeader eyebrow="RW 16" title="Detail Surat Masuk" /><div className="mx-auto max-w-2xl p-5">Memuat surat…</div></main>;
  return <main className="min-h-screen bg-[var(--background)] pb-10">
    <PageHeader eyebrow="Nuansa Indah Ciomas · RW 16" title="Detail Surat Masuk" subtitle="Pemeriksaan akhir RW" />
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-5">
      {message && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{message}</p>}
      {!surat ? <div className="rounded-2xl bg-white p-5">Surat tidak tersedia.</div> : <section className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-xs text-slate-500">SURAT #{surat.id} · {surat.rt}</p>
        <h2 className="mt-1 text-xl font-bold">{surat.jenis_surat}</h2>
        <p className="mt-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-800">{surat.status}</p>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Pemohon</dt><dd className="font-semibold">{warga?.nama ?? "—"}</dd></div><div><dt className="text-slate-500">NIK</dt><dd>{warga?.nik ?? "—"}</dd></div><div className="sm:col-span-2"><dt className="text-slate-500">Alamat</dt><dd>{warga?.alamat ?? "—"}</dd></div><div className="sm:col-span-2"><dt className="text-slate-500">Keperluan</dt><dd className="whitespace-pre-wrap">{typeof surat.payload?.keperluan === "string" ? surat.payload.keperluan : "—"}</dd></div></dl>
        {surat.ditolak_alasan && <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">Alasan sebelumnya: {surat.ditolak_alasan}</p>}
        <div className="mt-5 border-t pt-4"><h3 className="font-bold">Riwayat proses</h3>{history.length ? <ol className="mt-3 space-y-3">{history.map((event) => <li key={event.id} className="rounded-lg bg-slate-50 p-3 text-sm"><p className="font-semibold">{event.action.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-slate-600">{event.from_status && event.to_status ? `${event.from_status} → ${event.to_status} · ` : ""}{new Date(event.occurred_at).toLocaleString("id-ID")}</p></li>)}</ol> : <p className="mt-2 text-sm text-slate-500">Belum ada event riwayat.</p>}</div>
        <div className="mt-5 space-y-2 text-sm"><p>Persetujuan/TTD RT: {surat.ttd_rt ? `tercatat (${surat.ttd_rt_nama ?? "signer terdaftar"})` : "belum tercatat"}</p><p>Persetujuan/TTD RW: {surat.ttd_rw ? `tercatat (${surat.ttd_rw_nama ?? "signer terdaftar"})` : "belum tercatat"}</p><p>Nomor resmi: {surat.nomor_surat ?? "belum dialokasikan"}</p></div>
        {surat.status === "MENUNGGU_RW" && <div className="mt-6 grid grid-cols-2 gap-3"><button disabled={busy} onClick={() => void decide("rw_reject")} className="rounded-xl bg-red-600 p-3 font-bold text-white disabled:opacity-50">Minta Perbaikan</button><button disabled={busy} onClick={() => void decide("rw_approve")} className="rounded-xl bg-emerald-700 p-3 font-bold text-white disabled:opacity-50">Setujui dan TTD RW</button></div>}
        {surat.status === "DISETUJUI_RW" && <p className="mt-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">Persetujuan dan tanda tangan RW dicatat oleh RPC menggunakan signer assignment terdaftar. Status belum TERBIT; finalisasi membutuhkan worker, format nomor resmi, template, dan aset resmi terkonfigurasi.</p>}
        {surat.status === "TERBIT" && <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">Surat telah terbit dan PDF final disimpan secara privat. Pengunduhan PDF dari aplikasi belum tersedia.</p>}
      </section>}
    </div>
  </main>;
}
