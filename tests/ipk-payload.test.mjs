import test from "node:test";
import assert from "node:assert/strict";
import { buildIpkRpcPayload } from "../lib/kas/ipk-payload.mjs";

const rows = ["06", "01", "04", "02", "05", "03"].map((rt, index) => ({ rt, terkumpul: index * 100 }));

test("IPK RPC payload contains exactly one normalized row for each RT", () => {
  const payload = buildIpkRpcPayload("2026-10", rows, "Oktober 2026");
  assert.equal(payload.p_bulan, "2026-10-01");
  assert.deepEqual(payload.p_rows.map((row) => row.rt), ["01", "02", "03", "04", "05", "06"]);
  assert.deepEqual(payload.p_rows.map((row) => row.terkumpul), [100, 300, 500, 200, 400, 0]);
  assert.equal(payload.p_rows[0].keterangan, "IPK Bulanan RT 01 - Oktober 2026");
});

test("IPK payload rejects incomplete, duplicate, invalid, or unsafe values", () => {
  assert.throws(() => buildIpkRpcPayload("2026-10", rows.slice(1), "Oktober 2026"));
  assert.throws(() => buildIpkRpcPayload("2026-10", [...rows.slice(1), { rt: "05", terkumpul: 0 }], "Oktober 2026"));
  assert.throws(() => buildIpkRpcPayload("2026-10", rows.map((row, index) => index ? row : { ...row, terkumpul: -1 }), "Oktober 2026"));
  assert.throws(() => buildIpkRpcPayload("2026-13", rows, "Oktober 2026"));
  assert.throws(() => buildIpkRpcPayload("2026-10", rows.map((row, index) => index ? row : { ...row, terkumpul: Number.MAX_SAFE_INTEGER + 1 }), "Oktober 2026"));
});

test("IPK payload rejects a combined total outside the safe integer range", () => {
  const oversizedTotal = rows.map((row) => ({ ...row, terkumpul: Number.MAX_SAFE_INTEGER }));
  assert.throws(() => buildIpkRpcPayload("2026-10", oversizedTotal, "Oktober 2026"), /Total IPK/);
});
