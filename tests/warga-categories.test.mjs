import test from "node:test";
import assert from "node:assert/strict";
import { parseWargaCategoryIds } from "../lib/warga/category-input.mjs";

test("resident category parser distinguishes omitted categories from an explicit clear", () => {
  assert.deepEqual(parseWargaCategoryIds({}), { ids: null });
  assert.deepEqual(parseWargaCategoryIds({ kategori_ids: [] }), { ids: [] });
});

test("resident category parser accepts multiple IDs and removes duplicates", () => {
  assert.deepEqual(parseWargaCategoryIds({ kategori_ids: [1, 2, 1, 8] }), { ids: [1, 2, 8] });
});

test("resident category parser rejects invalid IDs rather than silently dropping them", () => {
  for (const kategori_ids of [null, "1", [0], [-1], [1.5], [Number.MAX_SAFE_INTEGER + 1], ["2"]]) {
    assert.equal(parseWargaCategoryIds({ kategori_ids }).error, "Daftar kategori warga tidak valid.");
  }
});
