import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { canManageKas, canReadKas } from "../lib/kas/authority.mjs";

test("Kas read authority includes RW, Bendahara, and ADMIN; unrelated roles stay denied", () => {
  assert.equal(canReadKas("RW"), true);
  assert.equal(canReadKas("BENDAHARA"), true);
  assert.equal(canReadKas("ADMIN"), true);
  for (const role of ["WARGA", "RT", null, undefined]) assert.equal(canReadKas(role), false);
});

test("only the documented managers receive Kas write controls", () => {
  assert.equal(canManageKas("BENDAHARA"), true);
  assert.equal(canManageKas("ADMIN"), true);
  for (const role of ["RW", "WARGA", "RT", null, undefined]) assert.equal(canManageKas(role), false);
});

test("RW is admitted to read routes while write-only Kas routes retain manager gates", async () => {
  const files = [
    "../app/kas/layout.tsx",
    "../app/kas/tambah/layout.tsx",
    "../app/kas/pengaturan/layout.tsx",
    "../app/kas/page.tsx",
    "../app/kas/transaksi/page.tsx",
    "../app/kas/ipk/page.tsx",
  ];
  const [rootLayout, tambahLayout, settingsLayout, ...readPages] = await Promise.all(
    files.map((file) => readFile(new URL(file, import.meta.url), "utf8")),
  );
  assert.match(rootLayout, /allowedRoles=\{\["RW", "BENDAHARA", "ADMIN"\]\}/);
  for (const layout of [tambahLayout, settingsLayout]) {
    assert.match(layout, /allowedRoles=\{\["BENDAHARA", "ADMIN"\]\}/);
  }
  for (const page of readPages) assert.match(page, /useKasAuthority/);
});
