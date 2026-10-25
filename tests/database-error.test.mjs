import test from "node:test";
import assert from "node:assert/strict";
import { databaseErrorHttpStatus } from "../lib/http/database-error.mjs";

test("database authorization, validation, conflicts, and missing rows map to client statuses", () => {
  assert.equal(databaseErrorHttpStatus("42501"), 403);
  assert.equal(databaseErrorHttpStatus("22023"), 400);
  assert.equal(databaseErrorHttpStatus("23503"), 409);
  assert.equal(databaseErrorHttpStatus("23505"), 409);
  assert.equal(databaseErrorHttpStatus("23514"), 409);
  assert.equal(databaseErrorHttpStatus("P0002"), 404);
});

test("unknown SQL failures remain service errors", () => {
  assert.equal(databaseErrorHttpStatus("08006"), 503);
  assert.equal(databaseErrorHttpStatus(null), 503);
  assert.equal(databaseErrorHttpStatus(undefined), 503);
});
