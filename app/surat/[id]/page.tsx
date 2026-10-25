"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/AppShell";
import { supabase } from "@/lib/supabase/client";
import { sendSuratCommand } from "@/lib/surat/command-client";

type SuratRow = {
  id: number;
  warga_id: number;
  keluarga_id: string;
  rt_id_at_submission: string;
  rt: string;
  jenis_surat: string;
  payload: Record<string, unknown>;
  status: string;
  workflow_version: number;
  nomor_surat: string | null;
  ditolak_alasan: string | null;
  created_at: string;
  ttd_rt: boolean;
  ttd_rt_at: string | null;
  ttd_rt_nama: string | null;
  ttd_rw: boolean;
  ttd_rw_at: string | null;
  ttd_rw_nama: string | null;
};

type WargaRow = { id: number; nama: string; nik: string; no_kk: string | null; alamat: string | null };
type HistoryRow = { id: number; action: string; from_status: string | null; to_status: string | null; actor_role: string | null; occurred_at: string };
type SuratDetail = SuratRow & { warga: WargaRow | null };

const statusLabel: Record<string, string> = {
  DRAFT: "Draft",
  MENUNGGU_RT: "Menunggu pemeriksaan RT",
  DISETUJUI_RT: "Disetujui RT · menunggu diteruskan",
  MENUNGGU_RW: "Menunggu pemeriksaan RW",
  DISETUJUI_RW: "Disetujui RW · finalisasi PDF menunggu",
  PERLU_PERBAIKAN: "Perlu perbaikan",
  FINALIZING_PDF: "PDF sedang difinalisasi",
  PDF_RETRY: "Finalisasi PDF perlu dicoba ulang oleh server",
  TERBIT: "Terbit",
  DIBATALKAN: "Dibatalkan",
};

export default function DetailSuratPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [surat, setSurat] = useState<SuratDetail | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [role, setRole] = useState("");
  const [keperluan, setKeperluan] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async (id: number) => {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) { router.replace("/login"); return; }
    const { data: profile, error: profileError } = await supabase.from("profiles")
      .select("role, no_kk, rt")
      .eq("id", auth.user.id).maybeSingle();
    if (profileError || !profile) throw new Error("Profil akses akun belum tersedia.");
    if (!["WARGA", "RT", "ADMIN"].includes(profile.role)) {
      router.replace(profile.role === "RW" ? `/rw/surat/${id}` : profile.role === "BENDAHARA" ? "/kas" : "/login");
      return;
    }
    const { data, error } = await supabase.from("surat").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Surat tidak ditemukan atau Anda tidak memiliki akses.");
    const { data: warga, error: wargaError } = await supabase.from("warga")
      .select("id, nama, nik, no_kk, alamat").eq("id", data.warga_id).maybeSingle();
    if (wargaError) throw wargaError;
    const { data: events, error: historyError } = await supabase.from("surat_history")
      .select("id, action, from_status, to_status, actor_role, occurred_at")
      .eq("surat_id", id).order("occurred_at", { ascending: true });
    if (historyError) throw historyError;
    if (profile.role === "WARGA" && (!profile.no_kk || warga?.no_kk !== profile.no_kk)) throw new Error("Surat tidak ditemukan.");
    if (profile.role === "RT" && profile.rt !== data.rt) throw new Error("Surat tidak ditemukan.");
    const row = { ...data, warga: warga ?? null } as SuratDetail;
    setRole(profile.role);
    setSurat(row);
    setHistory(events ?? []);
    setKeperluan(typeof row.payload?.keperluan === "string" ? row.payload.keperluan : "");
  }, [router]);

  useEffect(() => {
    let active = true;
    void params.then(({ id }) => {
      const parsed = Number(id);
      if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error("ID surat tidak valid.");
      return load(parsed);
    }).catch((error: unknown) => { if (active) setMessage(error instanceof Error ? error.message : "Gagal memuat surat."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params, load]);

  async function submitCorrection() {
    if (!surat || !keperluan.trim()) { setMessage("Keperluan surat wajib diisi."); return; }
    setBusy(true); setMessage("");
    const { error } = await supabase.rpc("submit_surat", {
      p_surat_id: surat.id,
      p_payload: { ...surat.payload, keperluan: keperluan.trim() },
    });
    if (error) setMessage("Pengajuan gagal disimpan. Surat mungkin sudah berpindah tahap.");
    else { setMessage("Surat berhasil dikirim ke antrean RT."); await load(surat.id); }
    setBusy(false);
  }

  async function runCommand(command: string, reason?: string) {
    if (!surat) return;
    setBusy(true); setMessage("");
    try {
      await sendSuratCommand(surat.id, command, reason);
      setMessage("Perubahan tahap surat berhasil disimpan.");
      await load(surat.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Perubahan surat gagal disimpan.");
    } finally { setBusy(false); }
  }

  async function decideRt(decision: "approve" | "reject") {
    const reason = decision === "reject" ? window.prompt("Alasan surat perlu diperbaiki:") : undefined;
    if (decision === "reject" && reason === null) return;
    await runCommand(decision === "approve" ? "rt_approve" : "rt_reject", reason ?? undefined);
  }

  if (loading) return <main className="min-h-screen bg-[var(--background)]"><PageHeader eyebrow="RW 16" title="Detail Surat" /><div className="mx-auto max-w-2xl p-5">Memuat surat…</div></main>;
  return <main className="min-h-screen bg-[var(--background)] pb-10">
    <PageHeader eyebrow="Nuansa Indah Ciomas · RW 16" title="Detail Surat" subtitle="Riwayat dan tahapan permohonan surat" />
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-5">
      {message && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{message}</p>}
      {!surat ? <div className="rounded-2xl bg-white p-5">Surat tidak tersedia.</div> : <>
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-slate-500">SURAT #{surat.id} · {surat.rt}</p><h2 className="mt-1 text-xl font-bold">{surat.jenis_surat}</h2></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">{statusLabel[surat.status] ?? surat.status}</span></div>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Pemohon</dt><dd className="font-semibold">{surat.warga?.nama ?? "—"}</dd></div><div><dt className="text-slate-500">NIK</dt><dd>{surat.warga?.nik ?? "—"}</dd></div><div><dt className="text-slate-500">Alamat</dt><dd>{surat.warga?.alamat ?? "—"}</dd></div><div><dt className="text-slate-500">Dibuat</dt><dd>{new Date(surat.created_at).toLocaleString("id-ID")}</dd></div></dl>
          <div className="mt-5 rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase text-slate-500">Keperluan</p>{role === "WARGA" && ["DRAFT", "PERLU_PERBAIKAN"].includes(surat.status) ? <textarea value={keperluan} onChange={(event) => setKeperluan(event.target.value)} rows={4} className="mt-2 w-full rounded-lg border p-3" aria-label="Keperluan surat" /> : <p className="mt-2 whitespace-pre-wrap">{keperluan || "—"}</p>}</div>
          {surat.ditolak_alasan && <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">Alasan perbaikan: {surat.ditolak_alasan}</p>}
          <div className="mt-5 border-t pt-4"><h3 className="font-bold">Riwayat proses</h3>{history.length ? <ol className="mt-3 space-y-3">{history.map((event) => <li key={event.id} className="rounded-lg bg-slate-50 p-3 text-sm"><p className="font-semibold">{event.action.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-slate-600">{event.from_status && event.to_status ? `${event.from_status} → ${event.to_status} · ` : ""}{event.actor_role ?? "Sistem"} · {new Date(event.occurred_at).toLocaleString("id-ID")}</p></li>)}</ol> : <p className="mt-2 text-sm text-slate-500">Belum ada event riwayat.</p>}</div>
          <div className="mt-5 space-y-3 text-sm"><p>RT: {surat.ttd_rt ? `disetujui/ditandatangani ${surat.ttd_rt_nama ?? "oleh signer terdaftar"}` : "belum disetujui"}</p><p>RW: {surat.ttd_rw ? `disetujui/ditandatangani ${surat.ttd_rw_nama ?? "oleh signer terdaftar"}` : "belum disetujui"}</p><p>Nomor resmi: {surat.nomor_surat ?? "belum dialokasikan"}</p></div>
          {role === "WARGA" && ["DRAFT", "PERLU_PERBAIKAN"].includes(surat.status) && <button disabled={busy || !keperluan.trim()} onClick={() => void submitCorrection()} className="mt-5 w-full rounded-xl bg-emerald-700 p-3 font-bold text-white disabled:opacity-50">{busy ? "Mengirim…" : surat.status === "DRAFT" ? "Kirim ke RT" : "Kirim ulang ke RT"}</button>}
          {role === "RT" && surat.status === "MENUNGGU_RT" && <div className="mt-5 grid grid-cols-2 gap-3"><button disabled={busy} onClick={() => void decideRt("reject")} className="rounded-xl bg-red-600 p-3 font-bold text-white disabled:opacity-50">Minta Perbaikan</button><button disabled={busy} onClick={() => void decideRt("approve")} className="rounded-xl bg-emerald-700 p-3 font-bold text-white disabled:opacity-50">Setujui dan TTD RT</button></div>}
          {role === "RT" && surat.status === "DISETUJUI_RT" && <button disabled={busy} onClick={() => void runCommand("rt_queue")} className="mt-5 w-full rounded-xl bg-emerald-700 p-3 font-bold text-white disabled:opacity-50">Teruskan ke RW</button>}
          {surat.status === "DISETUJUI_RW" && <p className="mt-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">Persetujuan RW dan tanda tangan tercatat. Surat belum TERBIT sampai worker backend menyimpan dan memverifikasi PDF privat.</p>}
          {surat.status === "TERBIT" && <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">Surat telah terbit dan PDF final disimpan secara privat. Pengunduhan PDF dari aplikasi belum tersedia.</p>}
          {role === "ADMIN" && <p className="mt-5 rounded-xl bg-slate-100 p-4 text-sm text-slate-700">Arsip baca saja. ADMIN tidak memiliki kewenangan menyetujui atau menandatangani surat.</p>}
        </section>
      </>}
    </div>
  </main>;
}
