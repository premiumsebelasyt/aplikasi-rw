import test from "node:test";
import assert from "node:assert/strict";
import { requireMutationRow } from "../lib/db/require-mutation-row.mjs";
import { readFile } from "node:fs/promises";

test("mutation confirmation rejects silent zero-row RLS results", () => {
  assert.throws(
    () => requireMutationRow(null, null, "Gagal menyimpan transaksi"),
    /data tidak ditemukan atau tidak dapat diubah/,
  );
});

test("mutation confirmation preserves database errors", () => {
  assert.throws(
    () => requireMutationRow(null, { message: "permission denied" }, "Gagal menghapus transaksi"),
    /Gagal menghapus transaksi: permission denied/,
  );
});

test("mutation confirmation returns the row for a successful mutation", () => {
  const row = { id: 42 };
  assert.equal(requireMutationRow(row, null, "Gagal mengubah transaksi"), row);
});

test("Kas create, update, and delete paths require a returned database row", async () => {
  const files = [
    "../app/kas/tambah/page.tsx",
    "../app/kas/transaksi/page.tsx",
    "../app/kas/page.tsx",
    "../app/kas/pengaturan/page.tsx",
  ];
  const sources = await Promise.all(
    files.map((file) => readFile(new URL(file, import.meta.url), "utf8")),
  );
  for (const source of sources) {
    assert.match(source, /requireMutationRow\(/);
    assert.match(source, /\.select\("id"\)\s*\.maybeSingle\(\)/);
  }
  assert.match(sources[1], /\.delete\(\)[\s\S]*?\.select\("id"\)\s*\.maybeSingle\(\)/);
});
