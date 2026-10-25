const CASH_READ_ROLES = new Set(["RW", "BENDAHARA", "ADMIN"]);
const CASH_MANAGER_ROLES = new Set(["BENDAHARA", "ADMIN"]);

export function canReadKas(role) {
  return CASH_READ_ROLES.has(role);
}

export function canManageKas(role) {
  return CASH_MANAGER_ROLES.has(role);
}
