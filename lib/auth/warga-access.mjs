import { normalizeRtScope } from "../warga/rt-scope.ts";

const STAFF_ROLES = new Set(["RT", "RW", "ADMIN"]);

export function canAccessWargaList(role) {
  return STAFF_ROLES.has(role);
}

export function canReadWarga({ role, profile, warga }) {
  if (!profile || !warga) return false;
  if (role === "RW" || role === "ADMIN") return true;
  if (role === "RT") {
    const assignedRt = normalizeRtScope(profile.rt);
    return Boolean(assignedRt && normalizeRtScope(warga.rt) === assignedRt);
  }
  if (role === "WARGA") {
    return Boolean(profile.no_kk && String(warga.no_kk ?? "") === String(profile.no_kk));
  }
  return false;
}

export function canMutateWarga({ role, profile, warga, action }) {
  if (!["create", "update", "delete"].includes(action)) return false;
  if (action === "delete") return role === "RW";
  if (role === "RW" || role === "ADMIN") return true;
  if (role !== "RT" || !profile) return false;
  const assignedRt = normalizeRtScope(profile.rt);
  if (!assignedRt) return false;
  return action === "create" || Boolean(warga && normalizeRtScope(warga.rt) === assignedRt);
}
