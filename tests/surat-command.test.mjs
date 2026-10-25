import test from "node:test";
import assert from "node:assert/strict";
import { executeSuratCommand, prepareSuratCommand } from "../lib/surat/command.mjs";
import { readFile } from "node:fs/promises";

test("approval and signature operations map to canonical RT/RW RPCs", () => {
  assert.deepEqual(prepareSuratCommand("RT", { command: "rt_approve", suratId: 12 }), {
    rpc: "decide_surat_rt", args: { p_surat_id: 12, p_decision: "APPROVED", p_reason: null },
  });
  assert.deepEqual(prepareSuratCommand("RT", { command: "rt_queue", suratId: "12" }), {
    rpc: "queue_surat_for_rw", args: { p_surat_id: 12 },
  });
  assert.deepEqual(prepareSuratCommand("RW", { command: "rw_approve", suratId: 13 }), {
    rpc: "decide_surat_rw", args: { p_surat_id: 13, p_decision: "APPROVED", p_reason: null },
  });
});

test("ADMIN, warga, and bendahara cannot invoke approval or signature commands", () => {
  for (const role of ["ADMIN", "WARGA", "BENDAHARA"]) {
    for (const command of ["rt_approve", "rt_reject", "rt_queue", "rw_approve", "rw_reject"]) {
      assert.equal(prepareSuratCommand(role, { command, suratId: 4 }).status, 403);
    }
  }
  assert.equal(prepareSuratCommand("RT", { command: "rw_approve", suratId: 4 }).status, 403);
  assert.equal(prepareSuratCommand("RW", { command: "rt_approve", suratId: 4 }).status, 403);
});

test("invalid IDs and rejection without a reason are rejected before RPC", () => {
  assert.equal(prepareSuratCommand("RT", { command: "rt_approve", suratId: "4x" }).status, 400);
  assert.equal(prepareSuratCommand("RW", { command: "rw_reject", suratId: 5, reason: "  " }).status, 400);
  assert.equal(prepareSuratCommand("RT", { command: "rt_reject", suratId: 5, reason: "Alamat perlu dikoreksi" }).args.p_reason, "Alamat perlu dikoreksi");
});

test("RPC errors are returned as failures and never represented as success", async () => {
  let called = false;
  const result = await executeSuratCommand({
    role: "RW", body: { command: "rw_approve", suratId: 9 },
    rpc: async (name, args) => { called = true; assert.equal(name, "decide_surat_rw"); assert.equal(args.p_surat_id, 9); return { error: { code: "42501" } }; },
  });
  assert.equal(called, true);
  assert.equal(result.success, undefined);
  assert.equal(result.status, 403);
});

test("SQL business conflicts are HTTP conflicts, not service outages", async () => {
  for (const [code, expectedStatus] of [["23514", 409], ["23505", 409], ["22023", 400]]) {
    const result = await executeSuratCommand({
      role: "RW", body: { command: "rw_approve", suratId: 9 },
      rpc: async () => ({ error: { code } }),
    });
    assert.equal(result.success, undefined);
    assert.equal(result.status, expectedStatus);
    assert.equal(result.code, code);
  }
});

test("route uses verified bearer identity and user JWT for business RPC", async () => {
  const route = await readFile(new URL("../app/api/surat/[id]/command/route.ts", import.meta.url), "utf8");
  assert.match(route, /admin\.auth\.getUser\(match\[1\]\)/);
  assert.match(route, /createSupabaseUserClient\(match\[1\]\)/);
  assert.match(route, /userClient\.rpc\(name, args\)/);
  assert.doesNotMatch(route, /createSupabaseAdmin\(\)[\s\S]{0,500}\.rpc\(/);
  assert.match(route, /!profile\?\.aktif/);
  assert.match(route, /String\(body\.suratId\) !== id/);
});

test("surat screens use canonical creation/submission/decision RPCs, not direct mutations", async () => {
  const files = [
    "../app/buat-surat/page.tsx", "../app/surat/[id]/page.tsx",
    "../app/rw/surat/page.tsx", "../app/rw/surat/[id]/page.tsx",
  ];
  const sources = await Promise.all(files.map((file) => readFile(new URL(file, import.meta.url), "utf8")));
  assert.match(sources[0], /rpc\("create_surat_request"/);
  assert.match(sources[1], /rpc\("submit_surat"/);
  assert.match(sources[1], /"rt_approve"/);
  assert.match(sources[1], /"rt_queue"/);
  assert.match(sources[2], /"rw_approve"/);
  assert.match(sources[3], /"rw_reject"/);
  assert.match(sources[1], /from\("surat_history"\)/);
  assert.match(sources[3], /from\("surat_history"\)/);
  for (const source of sources) {
    assert.doesNotMatch(source, /\.from\("surat"\)\s*\.insert\(/);
    assert.doesNotMatch(source, /\.from\("surat"\)\s*\.update\(/);
  }
  assert.doesNotMatch(sources.join("\n"), /begin_surat_pdf_finalization|complete_surat_pdf_finalization/);
});

test("candidate permits scoped ADMIN archive reads but only RW decision authority", async () => {
  const sql = await readFile(new URL("../supabase/candidates/202610040001_canonical_baseline.sql", import.meta.url), "utf8");
  const decisionStart = sql.indexOf("create function public.decide_surat_rw(");
  const decision = sql.slice(decisionStart, sql.indexOf("$fn$;", decisionStart));
  assert.match(decision, /id=v_uid and aktif and role='RW'/);
  assert.doesNotMatch(decision, /ADMIN/);
  assert.match(sql, /create policy surat_scoped_read[^;]*app_can_access_surat\(id\)/);
  assert.match(sql, /p\.role in\('RW','ADMIN'\)/);
  assert.match(sql, /create policy rw16_private_final_pdf_read[^;]*public\.app_can_read_final_pdf\(name\)/);
  assert.match(sql, /f\.state='VERIFIED' and s\.status='TERBIT'/);
});

test("client workflow never exposes finalization RPC or final-PDF storage access", async () => {
  const pdf = await readFile(new URL("../lib/surat/pdf.ts", import.meta.url), "utf8");
  const routeFiles = [
    "../app/surat/[id]/page.tsx", "../app/rw/surat/[id]/page.tsx",
    "../app/api/surat/[id]/command/route.ts",
  ];
  const sources = await Promise.all(routeFiles.map((file) => readFile(new URL(file, import.meta.url), "utf8")));
  assert.match(pdf, /throw new Error\("PDF final belum tersedia melalui renderer privat backend\."\)/);
  assert.doesNotMatch(sources.join("\n"), /begin_surat_pdf_finalization|complete_surat_pdf_finalization|createSignedUrl|createPublicUrl/);
  assert.match(sources[0], /worker backend menyimpan dan memverifikasi PDF privat/);
  assert.match(sources[0], /Pengunduhan PDF dari aplikasi belum tersedia/);
  assert.match(sources[1], /Pengunduhan PDF dari aplikasi belum tersedia/);
  assert.doesNotMatch(sources.join("\n"), /Download PDF|Unduh PDF|downloadSuratPdf/);
});
