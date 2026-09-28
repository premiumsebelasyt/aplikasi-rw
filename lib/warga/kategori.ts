import { supabase } from "@/lib/supabase/client";

export type KategoriWarga = { id: number; nama: string };
export type RelasiKategoriWarga = { warga_id: number; kategori_id: number };

export async function ambilKategoriWarga() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Sesi login diperlukan untuk memuat kategori.");

  const response = await fetch("/api/warga/kategori", {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Data kategori warga belum dapat dimuat.");
  return result as { categories: KategoriWarga[]; relations: RelasiKategoriWarga[] };
}
