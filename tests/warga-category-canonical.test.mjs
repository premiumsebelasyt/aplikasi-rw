import test from "node:test";
import assert from "node:assert/strict";
import { presentWargaCategories } from "../lib/warga/category-canonical.mjs";

test("legacy category labels present as canonical names without losing links", () => {
  const result = presentWargaCategories(
    [{ id: 4, nama: "Anak" }, { id: 8, nama: "Disabilitas" }, { id: 9, nama: "Lansia" }],
    [{ warga_id: 12, kategori_id: 4 }, { warga_id: 12, kategori_id: 8 }],
  );
  assert.deepEqual(result.categories.map((item) => item.nama), ["Lansia", "Anak-anak", "Penyandang Disabilitas"]);
  assert.deepEqual(result.relations, [{ warga_id: 12, kategori_id: 4 }, { warga_id: 12, kategori_id: 8 }]);
});

test("canonical rows win over aliases and duplicate semantic links collapse", () => {
  const result = presentWargaCategories(
    [{ id: 4, nama: "Anak" }, { id: 10, nama: "Anak-anak" }],
    [{ warga_id: 12, kategori_id: 4 }, { warga_id: 12, kategori_id: 10 }],
  );
  assert.deepEqual(result.categories, [{ id: 10, nama: "Anak-anak" }]);
  assert.deepEqual(result.relations, [{ warga_id: 12, kategori_id: 10 }]);
});

test("unrecognized categories and their relations are preserved", () => {
  const result = presentWargaCategories([{ id: 2, nama: "Bantuan Lokal" }], [{ warga_id: 5, kategori_id: 2 }]);
  assert.deepEqual(result.categories, [{ id: 2, nama: "Bantuan Lokal" }]);
  assert.deepEqual(result.relations, [{ warga_id: 5, kategori_id: 2 }]);
});

test("canonical category presentation follows the agreed complete ordering", () => {
  const labels = ["Lainnya", "Ibu Hamil", "Penyandang Disabilitas", "Dewasa", "Remaja", "Anak-anak", "Balita", "Lansia"];
  const result = presentWargaCategories(labels.map((nama, id) => ({ id, nama })), []);
  assert.deepEqual(result.categories.map((category) => category.nama), [
    "Lansia", "Balita", "Anak-anak", "Remaja", "Dewasa",
    "Penyandang Disabilitas", "Ibu Hamil", "Lainnya",
  ]);
});
