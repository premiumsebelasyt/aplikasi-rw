import { supabase } from "@/lib/supabase/client";

export async function sendSuratCommand(suratId: number, command: string, reason?: string) {
  const { data, error } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (error || !accessToken) throw new Error("Sesi berakhir. Silakan login kembali.");

  const response = await fetch(`/api/surat/${suratId}/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ suratId, command, reason }),
  });
  const result = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(result?.error || "Perintah surat gagal disimpan.");
  return result;
}
