import test from "node:test";
import assert from "node:assert/strict";
import { calculateIpkTotal } from "../lib/kas/ipk-total.mjs";

test("calculates exact IPK total for normal values", () => {
  assert.equal(calculateIpkTotal([{ terkumpul: 0 }, { terkumpul: 125000 }, { terkumpul: 250000 }]), 375000);
});

test("rejects unsafe, fractional, negative, or missing IPK amounts", () => {
  for (const rows of [
    [{ terkumpul: Number.MAX_SAFE_INTEGER }, { terkumpul: 1 }],
    [{ terkumpul: Number.MAX_SAFE_INTEGER + 1 }],
    [{ terkumpul: 1.5 }],
    [{ terkumpul: -1 }],
    [{}],
  ]) assert.equal(calculateIpkTotal(rows), null);
});
