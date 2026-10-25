import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sql = await readFile(
  new URL("../supabase/candidates/202610040001_canonical_baseline.sql", import.meta.url),
  "utf8",
);
const catalogVerifier = await readFile(
  new URL("../supabase/diagnostics/verify_canonical_catalog.sql", import.meta.url),
  "utf8",
);
const catalogAssertions = await readFile(
  new URL("../supabase/diagnostics/assert_canonical_catalog.sql", import.meta.url),
  "utf8",
);
const localPrerequisites = await readFile(
  new URL("../supabase/diagnostics/local_postgres_prerequisites.sql", import.meta.url),
  "utf8",
);
const roleIntegrationSql = await readFile(
  new URL("../supabase/diagnostics/test_canonical_roles_rls.sql", import.meta.url),
  "utf8",
);
const localRunner = await readFile(
  new URL("../scripts/validate-canonical-postgres.ps1", import.meta.url),
  "utf8",
);

function functionBody(name) {
  const start = sql.indexOf(`create function public.${name}(`);
  assert.notEqual(start, -1, `missing function ${name}`);
  const end = sql.indexOf("$fn$;", start);
  assert.notEqual(end, -1, `unterminated function ${name}`);
  return sql.slice(start, end + 5);
}

test("canonical warga RPC binds authority to auth.uid and scopes RT changes", () => {
  const body = functionBody("save_warga_with_categories");
  assert.match(body, /p_warga_id bigint,p_warga jsonb,p_category_ids bigint\[\]/);
  assert.match(body, /v_uid uuid:=auth\.uid\(\)/);
  assert.match(body, /role not in\('RT','RW','ADMIN'\)/);
  assert.match(body, /v_p\.role='RT' and v_p\.rt_id is distinct from v_f\.rt_id/);
  assert.match(body, /set search_path=''/);
});

test("canonical account model allows at most one active WARGA profile per family", () => {
  assert.match(sql, /create unique index profiles_one_active_warga_family on public\.profiles\(keluarga_id\) where role='WARGA' and aktif;/);
  assert.match(catalogAssertions, /profiles_one_active_warga_family[\s\S]*?i\.indisunique and i\.indisvalid and i\.indpred is not null/);
});

test("trusted WARGA provisioning derives KK from family and retries idempotently", () => {
  const body = functionBody("provision_warga_profile");
  assert.match(body, /auth\.role\(\).*service_role/);
  assert.match(body, /select \* into v_family from public\.keluarga k where k\.id=p_keluarga_id and k\.aktif for share/);
  assert.match(body, /v_profile\.keluarga_id=v_family\.id and v_profile\.no_kk=v_family\.no_kk and v_profile\.aktif then return/);
  assert.match(body, /insert into public\.profiles\(id,role,keluarga_id,no_kk,nama,nama_lengkap,no_hp\)[\s\S]*?v_family\.no_kk/);
  assert.match(sql, /grant execute on function public\.provision_warga_profile\([^;]+ to service_role;/);
});

test("IPK RPC restricts writers, serializes month saves, and requires all six RT rows", () => {
  const body = functionBody("save_kas_ipk_month");
  assert.match(body, /app_current_role\(\) not in\('BENDAHARA','ADMIN'\)/);
  assert.match(body, /jsonb_array_length\(p_rows\)<>6/);
  assert.match(body, /count\(distinct e\.value->>'rt'\).*<>6/);
  assert.match(body, /pg_advisory_xact_lock/);
  assert.match(body, /on conflict\(bulan,rt_id\) do update/);
  assert.match(sql, /create policy kas_transaksi_manager_write[^;]+kas_ipk_id is null[^;]+kas_ipk_id is null/s);
  for (const table of ["kas_kategori", "kas_ipk", "kas_transaksi", "kas_saldo_awal"]) {
    const policies = [...sql.matchAll(new RegExp(`create policy [^;]+ on public\\.${table}[^;]*;`, "g"))].map(([policy]) => policy);
    assert.ok(policies.length > 0, `${table} policies exist`);
    for (const policy of policies) assert.match(policy, /BENDAHARA/, `${table} policy is scoped to authorized Kas roles`);
  }
});

test("surat decisions enforce RT and RW roles and keep ADMIN out of approval", () => {
  assert.match(functionBody("decide_surat_rt"), /role='RT'/);
  assert.match(functionBody("decide_surat_rt"), /v_p\.rt_id/);
  assert.match(functionBody("decide_surat_rw"), /role='RW'/);
  assert.doesNotMatch(functionBody("decide_surat_rw"), /role in\([^)]*ADMIN/);
  assert.match(functionBody("decide_surat_rt"), /Alasan penolakan wajib diisi/);
  assert.match(functionBody("decide_surat_rw"), /Alasan penolakan wajib/);
});

test("surat request, submission, routing, and finalization RPCs enforce scope and canonical states", () => {
  assert.match(functionBody("create_surat_request"), /role='WARGA'/);
  assert.match(functionBody("create_surat_request"), /from public\.warga where id=p_warga_id and keluarga_id=v_p\.keluarga_id/);
  assert.match(functionBody("submit_surat"), /p\.role='WARGA' and p\.keluarga_id=v_s\.keluarga_id/);
  assert.match(functionBody("submit_surat"), /v_s\.status not in\('DRAFT','PERLU_PERBAIKAN'\)/);
  assert.match(functionBody("submit_surat"), /v_s\.status not in\('DRAFT','PERLU_PERBAIKAN'\) then raise exception[^;]*using errcode='23514'/);
  assert.match(functionBody("submit_surat"), /jsonb_typeof\(p_payload\) is distinct from 'object' then raise exception[^;]*using errcode='22023'/);
  assert.match(functionBody("decide_surat_rt"), /v_s\.status<>'MENUNGGU_RT' or v_s\.rt_id_at_submission<>v_p\.rt_id/);
  assert.match(functionBody("queue_surat_for_rw"), /v_s\.status<>'DISETUJUI_RT'/);
  assert.match(functionBody("queue_surat_for_rw"), /p\.role='RT' and p\.rt_id=v_s\.rt_id_at_submission/);
  assert.match(functionBody("decide_surat_rw"), /v_s\.status<>'MENUNGGU_RW'/);
  assert.match(functionBody("begin_surat_pdf_finalization"), /coalesce\(auth\.role\(\),''\)<>'service_role'/);
  assert.match(functionBody("begin_surat_pdf_finalization"), /v_s\.status not in\('DISETUJUI_RW','FINALIZING_PDF','PDF_RETRY'\)/);
});

test("authenticated clients receive no direct surat mutation grant", () => {
  assert.match(sql, /revoke all on table[^;]*public\.surat[^;]*from public,anon,authenticated;/);
  assert.doesNotMatch(sql, /grant (?:insert|update|delete|all)[^;]*public\.surat[^;]*to authenticated/i);
  for (const name of ["create_surat_request", "submit_surat", "decide_surat_rt", "queue_surat_for_rw", "decide_surat_rw"]) {
    assert.match(sql, new RegExp(`grant execute on function public\\.${name}\\([^;]+ to authenticated;`));
  }
});

test("TERBIT surat rows cannot be changed, deleted, or truncated after publication", () => {
  const body = functionBody("guard_terbit_surat_immutable");
  assert.match(body, /security definer set search_path=''/);
  assert.match(body, /tg_op='UPDATE'.*old\.status='TERBIT'.*to_jsonb\(new\) is distinct from to_jsonb\(old\)/s);
  assert.match(body, /tg_op='DELETE'.*old\.status='TERBIT'.*raise exception/s);
  assert.match(body, /tg_op='TRUNCATE'.*where status='TERBIT'/s);
  assert.match(sql, /create trigger surat_terbit_immutable before update or delete on public\.surat[\s\S]*?execute function public\.guard_terbit_surat_immutable\(\)/);
  assert.match(sql, /create trigger surat_terbit_no_truncate before truncate on public\.surat[\s\S]*?execute function public\.guard_terbit_surat_immutable\(\)/);
});

test("published private PDF object cannot be replaced, deleted, or truncated", () => {
  const body = functionBody("guard_published_final_pdf_immutable");
  assert.match(body, /security definer set search_path=''/);
  assert.match(body, /tg_op='TRUNCATE'[\s\S]*?status='TERBIT'[\s\S]*?raise exception/s);
  assert.match(body, /tg_op in\('UPDATE','DELETE'\)[\s\S]*?old\.bucket_id='rw16-surat-final'[\s\S]*?status='TERBIT'/);
  assert.match(body, /tg_op in\('INSERT','UPDATE'\)[\s\S]*?new\.bucket_id='rw16-surat-final'[\s\S]*?status='TERBIT'/);
  assert.match(sql, /create trigger published_final_pdf_immutable before insert or update or delete on storage\.objects[\s\S]*?execute function public\.guard_published_final_pdf_immutable\(\)/);
  assert.match(sql, /create trigger published_final_pdf_no_truncate before truncate on storage\.objects[\s\S]*?execute function public\.guard_published_final_pdf_immutable\(\)/);
});

test("TERBIT transition requires the complete canonical approval, signature, snapshot, allocation, and private PDF chain", () => {
  const body = functionBody("guard_surat_final_state");
  assert.match(body, /old\.status not in\('FINALIZING_PDF','PDF_RETRY'\)/);
  assert.match(body, /a\.stage='RT' and a\.decision='APPROVED'/);
  assert.match(body, /a\.stage='RW' and a\.decision='APPROVED'/);
  assert.match(body, /s\.signer_profile_id=a\.actor_id/);
  assert.match(body, /f\.state='VERIFIED'/);
  assert.match(body, /a\.allocation_state='ISSUED' and a\.official_number=new\.nomor_surat/);
  assert.match(body, /b\.public is false/);
  assert.match(body, /f\.snapshot->'applicant'=v\.applicant_snapshot/);
  assert.match(body, /f\.snapshot->'approvals'=/);
  assert.match(body, /f\.snapshot->'signatures'=/);
});

test("prepared Storage scope fixture satisfies the candidate TERBIT guard with synthetic metadata only", () => {
  assert.match(roleIntegrationSql, /insert into public\.surat_versions\([\s\S]*?applicant_snapshot[\s\S]*?where s\.id in\(92001,92002\)/);
  assert.match(roleIntegrationSql, /insert into public\.surat_approval[\s\S]*?'RT','APPROVED'[\s\S]*?'RW','APPROVED'/);
  assert.match(roleIntegrationSql, /insert into public\.surat_signatures[\s\S]*?signature_asset_version[\s\S]*?stamp_asset_version/);
  assert.match(roleIntegrationSql, /'applicant',v\.applicant_snapshot[\s\S]*?'approvals',coalesce[\s\S]*?'signatures',coalesce/);
  assert.match(roleIntegrationSql, /insert into storage\.objects\(bucket_id,name\) values[\s\S]*?'rw16-surat-final','synthetic\/final\/kk-rt01\.pdf'/);
  assert.match(roleIntegrationSql, /update public\.surat set status='FINALIZING_PDF'[\s\S]*?update public\.surat set status='TERBIT'/);
  assert.match(roleIntegrationSql, /metadata-only rows and sentinel hashes,?[\s\S]*?not PDF bytes/i);
  assert.doesNotMatch(roleIntegrationSql, /\\copy|curl|fetch\(|http/i);
});

test("Kas candidate grants read to RW and management to authorized Bendahara and ADMIN", () => {
  for (const table of ["kas_kategori", "kas_ipk", "kas_transaksi", "kas_saldo_awal"]) {
    for (const match of sql.matchAll(new RegExp(`create policy [^;]+ on public\\.${table}[^;]*;`, "g"))) {
      assert.match(match[0], /BENDAHARA/);
      assert.match(match[0], /ADMIN/);
    }
  }
  assert.match(functionBody("save_kas_ipk_month"), /app_current_role\(\) not in\('BENDAHARA','ADMIN'\)/);
  assert.match(sql, /guard_ipk_managed_writes\(\)[\s\S]*?create trigger guard_kas_ipk_managed_writes/);
  assert.match(sql, /guard_kas_transaksi_ipk_update[\s\S]*?old\.kas_ipk_id is not null or new\.kas_ipk_id is not null/);
  assert.doesNotMatch(functionBody("decide_surat_rw"), /role in\([^)]*ADMIN/);
});

test("canonical baseline revokes API execution on trigger-only functions and pins every definer path", () => {
  const triggerOnly = [
    "sync_scope_projection",
    "sync_family_projections",
    "reject_immutable_mutation",
    "snapshot_surat_history_actor",
    "guard_surat_number_allocation",
    "guard_surat_final_state",
    "guard_terbit_surat_immutable",
    "guard_published_final_pdf_immutable",
    "guard_ipk_managed_writes",
  ];
  for (const name of triggerOnly) {
    assert.match(
      sql,
      new RegExp(`revoke all on function public\\.${name}\\(\\) from public,anon,authenticated;`),
      `${name} should not have direct API EXECUTE grants`,
    );
  }

  const functionBlocks = sql
    .split(/(?=^create function public\.)/m)
    .filter((block) => block.startsWith("create function public."));
  assert.equal(functionBlocks.length, 27, "canonical function count changed; review the inventory");
  const definers = functionBlocks.filter((block) => /^create function public\.[\s\S]*?security definer\b/m.test(block));
  assert.equal(definers.length, 24, "SECURITY DEFINER count changed; review grants and search_path");
  for (const block of definers) {
    assert.match(block, /set search_path=''/, block.slice(0, 120));
  }
});

test("every canonical table enables and forces RLS; Storage buckets are private", () => {
  const tables = [...sql.matchAll(/^create table public\.([a-z_]+)/gm)].map((match) => match[1]);
  assert.equal(tables.length, 22);
  for (const table of tables) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security;`));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security;`));
  }
  assert.match(sql, /values\('rw16-surat-final','rw16-surat-final',false\),\('rw16-surat-assets','rw16-surat-assets',false\)/);
  assert.match(sql, /create policy rw16_private_final_pdf_read on storage\.objects for select to authenticated using\(bucket_id='rw16-surat-final' and public\.app_can_read_final_pdf\(name\)\)/);
});

test("runtime validation assets are synthetic, read-only for catalog checks, and loopback-only", () => {
  assert.match(catalogAssertions, /do \$assert\$/);
  assert.match(catalogAssertions, /has_function_privilege\('anon'/);
  assert.match(catalogAssertions, /relrowsecurity and c\.relforcerowsecurity/);
  assert.match(catalogAssertions, /Public function count differs from expected/);
  assert.match(catalogAssertions, /exactly 24 SECURITY DEFINER functions/);
  assert.match(catalogAssertions, /composite surat applicant\/family FK is missing/);
  assert.match(catalogAssertions, /policy counts differ from expected/);
  assert.match(catalogAssertions, /rw16_private_final_pdf_read/);
  assert.match(localPrerequisites, /LOCAL ONLY/);
  assert.match(localPrerequisites, /request\.jwt\.claim\.sub/);
  assert.match(localPrerequisites, /storage\.objects/);
  assert.match(roleIntegrationSql, /Synthetic/);
  assert.match(roleIntegrationSql, /set local role anon/);
  assert.match(roleIntegrationSql, /save_kas_ipk_month/);
  assert.match(roleIntegrationSql, /direct IPK update is denied and leaves amount unchanged/);
  assert.match(roleIntegrationSql, /RLS blocks direct mutation of IPK-linked ledger row/);
  assert.match(roleIntegrationSql, /RLS blocks direct deletion of IPK-linked ledger row/);
  assert.match(catalogAssertions, /Atomic IPK managed-write guards are missing/);
  assert.match(roleIntegrationSql, /failed IPK call left no partial rows/);
  assert.match(roleIntegrationSql, /synthetic\/final\/kk-rt01\.pdf/);
  assert.match(roleIntegrationSql, /ADMIN reads final-object metadata/);
  assert.match(roleIntegrationSql, /published final object metadata survives rejected update\/delete\/truncate/);
  assert.match(roleIntegrationSql, /rollback;/i);
  assert.match(localRunner, /\$loopbackHost = '127\.0\.0\.1'/);
  assert.match(localRunner, /rw16\.local_validation/);
  assert.match(localRunner, /Get-Command \$toolName/);
  assert.doesNotMatch(localRunner, /supabase db push|supabase link|NEXT_PUBLIC_SUPABASE|SERVICE_ROLE_KEY/i);
});

test("prepared catalog verifier contains SELECT-only statements", () => {
  const statements = catalogVerifier
    .replace(/^\s*--.*$/gm, "")
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
  assert.ok(statements.length >= 9);
  for (const statement of statements) {
    assert.match(statement, /^(select|with)\b/i, statement.slice(0, 100));
  }
});

