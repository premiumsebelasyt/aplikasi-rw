const SQLSTATE_HTTP_STATUS = Object.freeze({
  "22023": 400,
  "23503": 409,
  "23505": 409,
  "23514": 409,
  "42501": 403,
  P0002: 404,
});

export function databaseErrorHttpStatus(code) {
  return SQLSTATE_HTTP_STATUS[code] ?? 503;
}
