import test from "node:test";
import assert from "node:assert/strict";
import { isValidNIK, isValidOptionalNoKK } from "../lib/warga/identity-validation.mjs";

test("NIK validation requires exactly 16 digits", () => {
  assert.equal(isValidNIK("1234567890123456"), true);
  for (const invalid of ["", "123", "123456789012345X", 1234567890123456, null]) {
    assert.equal(isValidNIK(invalid), false);
  }
});

test("No. KK may be omitted but must contain 16 digits when supplied", () => {
  assert.equal(isValidOptionalNoKK(null), true);
  assert.equal(isValidOptionalNoKK(""), true);
  assert.equal(isValidOptionalNoKK("1234567890123456"), true);
  assert.equal(isValidOptionalNoKK("1234"), false);
});
