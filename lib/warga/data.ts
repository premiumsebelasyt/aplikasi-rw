import { supabase } from "@/lib/supabase/client";

export type WargaApiData = {
  id: number;
  rt: string;
  [field: string]: unknown;
};

export async function ambilDataWarga<T extends { id: number; rt: string }>(id?: number) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Sesi login diperlukan.");

  const query = id === undefined ? "" : `?id=${encodeURIComponent(String(id))}`;
  const response = await fetch(`/api/warga${query}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Data warga belum dapat dimuat.");
  return result as { role: string; rt: string | null; warga: T[] };
}

export async function simpanDataWarga(payload: Record<string, unknown>, id?: number) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Sesi login diperlukan.");
  const response = await fetch("/api/warga", {
    method: id === undefined ? "POST" : "PATCH",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(id === undefined ? payload : { ...payload, id }),
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Data warga gagal disimpan.");
  return result as { id?: number; success?: boolean };
}
