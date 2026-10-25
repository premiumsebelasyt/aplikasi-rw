const transitionsByRole = {
  WARGA: new Set(["DRAFT->MENUNGGU_RT", "PERLU_PERBAIKAN->MENUNGGU_RT"]),
  RT: new Set(["MENUNGGU_RT->DISETUJUI_RT", "MENUNGGU_RT->PERLU_PERBAIKAN", "DISETUJUI_RT->MENUNGGU_RW"]),
  RW: new Set(["MENUNGGU_RW->DISETUJUI_RW", "MENUNGGU_RW->PERLU_PERBAIKAN"]),
  ADMIN: new Set(),
  BENDAHARA: new Set(),
};

/** UI guard for affordances only; RPC authorization and database state remain authoritative. */
export function canTransitionSurat(role, from, to) {
  return transitionsByRole[role]?.has(`${from}->${to}`) ?? false;
}
