import { databaseErrorHttpStatus } from "../http/database-error.mjs";

const rpcByCommand = {
  rt_approve: { role: "RT", rpc: "decide_surat_rt", decision: "APPROVED" },
  rt_reject: { role: "RT", rpc: "decide_surat_rt", decision: "REJECTED" },
  rt_queue: { role: "RT", rpc: "queue_surat_for_rw" },
  rw_approve: { role: "RW", rpc: "decide_surat_rw", decision: "APPROVED" },
  rw_reject: { role: "RW", rpc: "decide_surat_rw", decision: "REJECTED" },
};

export function prepareSuratCommand(role, body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Permintaan perintah surat tidak valid.", status: 400 };
  }
  const id = Number(body.suratId);
  if (!Number.isSafeInteger(id) || id < 1) {
    return { error: "ID surat tidak valid.", status: 400 };
  }
  const command = rpcByCommand[body.command];
  if (!command) return { error: "Perintah surat tidak valid.", status: 400 };
  if (role !== command.role) {
    return { error: "Role ini tidak berwenang menjalankan perintah surat.", status: 403 };
  }
  const args = { p_surat_id: id };
  if (command.decision) {
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (command.decision === "REJECTED" && !reason) {
      return { error: "Alasan penolakan wajib diisi.", status: 400 };
    }
    args.p_decision = command.decision;
    args.p_reason = command.decision === "REJECTED" ? reason : null;
  }
  return { rpc: command.rpc, args };
}

export async function executeSuratCommand({ role, body, rpc }) {
  const prepared = prepareSuratCommand(role, body);
  if (prepared.error) return prepared;
  const { error } = await rpc(prepared.rpc, prepared.args);
  if (error) {
    return {
      error: "Perubahan surat ditolak atau belum dapat disimpan. Muat ulang dan periksa tahap surat.",
      status: databaseErrorHttpStatus(error.code),
      code: error.code ?? null,
    };
  }
  return { success: true };
}
