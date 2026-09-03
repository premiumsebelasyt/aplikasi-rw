import { supabase } from "@/lib/supabase/client";

export default async function TestSupabasePage() {
  const { data, error } = await supabase
    .from("warga")
    .select("*")
    .limit(1);

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">
          Tes Supabase
        </h1>

        {error ? (
          <div className="mt-4 rounded-xl bg-red-50 p-4 text-red-700">
            <p className="font-semibold">Supabase terhubung, tapi tabel belum ada.</p>
            <p className="mt-1 text-sm">{error.message}</p>
          </div>
        ) : (
          <div className="mt-4 rounded-xl bg-green-50 p-4 text-green-700">
            <p className="font-semibold">
              Koneksi Supabase berhasil!
            </p>

            <pre className="mt-3 overflow-auto text-sm">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}