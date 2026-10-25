# Supabase setup for aplikasi-rw

## Current migration status

`candidates/202610040001_canonical_baseline.sql` is the canonical design candidate. It has been executed and catalog-validated on a disposable local PostgreSQL 17.11 cluster, and its synthetic role/RLS/Kas SQL checks pass. This does not emulate hosted Supabase Auth, PostgREST, or Storage APIs. It has not been applied to staging or production. Do not apply it with the normal `supabase db push` workflow.

The normal CLI migration order would run the three older files first. Their preconditions and legacy policy/trigger assumptions conflict with the canonical baseline. Applying only the new file through SQL Editor would leave Supabase's versioned migration ledger out of sync. Do not modify old migration history to claim migrations ran, and do not execute the old migrations blindly.

Before staging apply:

1. Preserve the current legacy migration files and production lineage unchanged. Create a dedicated canonical branch/lineage; in that lineage only, archive the three legacy SQL files unchanged outside `supabase/migrations/`, with an explicit note that they are incompatible with the empty canonical staging lineage. Make the validated canonical baseline the first active migration. Do not create fake ledger entries for the legacy migrations and do not use the shared migration directory with `db push`.
2. The baseline has passed the available disposable local PostgreSQL validation. Before hosted staging, still validate any Supabase-specific extension and Auth/Storage behavior that the local stubs cannot emulate.
3. Implement a trusted PDF worker that downloads the private stored PDF and verifies the actual bytes/checksum before completing publication.
4. Only after validation and a separate instruction, apply to verified `RW16-Staging`, then compare the read-only catalog inventory with the canonical design.
5. Create clearly fictional Auth/data fixtures through the official Auth Admin flow only after schema verification. Stop before security testing until separately requested.

PostgreSQL 17.11 binaries were extracted from the official EDB archive under `%TEMP%` for a loopback-only disposable cluster; no application dependency or Windows service was installed. `scripts/validate-canonical-postgres.ps1`, the catalog assertions, and the synthetic PostgreSQL role/RLS/Kas integration checks have now been executed successfully. See `RW16_DATABASE_VALIDATION.md` and `RW16_FINAL_COMPLETION_REPORT.md` for the scope and limitations.

## Scope and safety

- Production must not be used for baseline development or fixtures.
- Do not copy production credentials, database URLs, or resident data into staging.
- Never expose a secret key in a browser/mobile bundle, report, or chat.
- The canonical draft uses private buckets only. It is not yet an implemented/verified storage workflow.
- No commit, push, or deployment is part of the database baseline phase.

## Account provisioning

The canonical draft deliberately does not create a WARGA profile from user-controlled signup metadata. A household account must be linked only through a trusted provisioning flow after household ownership is verified. The baseline draft provides a service-role-only WARGA provisioning function; it does not yet define a complete trusted staff provisioning/admin workflow. Do not run ad hoc profile inserts against production.

Staff authority is stored in server-controlled profile fields. RT scope belongs in the relational RT assignment. The latest explicit owner override (2026-10-24) grants ADMIN general application access and Kas/IPK management, but no surat approval/signature authority. BENDAHARA also manages Kas/IPK; RW has read-only Kas access. Earlier phase-zero/readiness notes saying ADMIN lacks Kas authority predate and are superseded by that override. Any account bootstrap process must be reviewed and tested in staging before use.

Pendaftaran mandiri pada UI dan `/api/auth/sign-up` dinonaktifkan sampai tersedia proses verifikasi KK di luar aplikasi serta provisioning tepercaya. Endpoint tersebut tidak membuat Auth user tanpa profile keluarga. Login, endpoint warga/kategori, dan pemulihan password memeriksa status `profiles.aktif`; pemeriksaan aplikasi ini melengkapi, tetapi tidak menggantikan, RLS runtime.

## Current application integration status

- Warga writes use `save_warga_with_categories(p_warga_id, p_warga, p_category_ids)` with the verified caller JWT; the route does not pass a browser-supplied actor ID.
- Surat screens use canonical create/submit/RT/RW RPCs and read scoped history. ADMIN remains read-only for surat and has no approval/signature action. Direct browser mutations on surat workflow tables and browser final-PDF generation are disabled.
- Kas/IPK UI calls `save_kas_ipk_month`; ADMIN and BENDAHARA manage Kas/IPK, while RW is read-only. The candidate RLS and RPC checks enforce the same role boundary. Authenticated direct writes to IPK-linked rows are also blocked by candidate triggers so `save_kas_ipk_month` remains the atomic synchronization path.
- Local unit/source-contract tests (91/91), TypeScript, lint, build and dependency audit pass. In addition, the candidate has passed local PostgreSQL execution/catalog assertions and synthetic role/RLS/Kas integration tests; these do not test hosted Supabase endpoints.
- The candidate's TERBIT and private PDF immutability guards compiled and were exercised by the synthetic transaction against PostgreSQL. This does not validate actual Storage object bytes or the hosted Storage API.
- PDF issuance remains unavailable until a trusted finalization worker, official numbering/template configuration, and verified RT/RW signature and stamp assets are supplied.

Passing local checks does not prove hosted Auth, PostgREST RPC, Storage HTTP, or release behavior. Production and staging remain untouched. A staging apply remains blocked until Dashboard identity, a usable backup/recovery path, and the staging lineage/apply method are verified. Production remains gated on staging passing and verified recovery.

## Production compatibility audit — 2026-10-25

A read-only audit of the configured Production project found ten `profiles` rows, all linked to confirmed, unbanned Auth users: six RT profiles scoped to RT 01–06, one BENDAHARA, one RW, and two ADMIN. There are no WARGA profiles in this project. The live profile schema has `id`, `role`, `rt`, `login_id`, `no_kk`, and identity/contact fields, but no `aktif` column. The nine named staff Auth identities still use the legacy `@rw16.invalid` suffix. The login UI may accept the canonical internal alias, but the server must map it to the existing Auth address for the exact Supabase project; it must not change account email or password implicitly.

The read-only anonymous checks returned no rows from populated warga, surat, and Kas tables; `profiles` denied anonymous SELECT. These checks do not verify authenticated role-specific RLS policies. The currently served `nic16.vercel.app` client bundle references the staging project, so it is not a verified Production deployment. Do not promote or push to the Production branch until the Vercel Production environment points to `qspglnzoayczbpgmhsnh`, the missing WARGA profile/provisioning path is resolved, and role-scoped authenticated access is verified.

`migrations/202610250001_profile_active_gate.sql` is a forward-only compatibility migration for the legacy schema. It adds `profiles.aktif` with a fail-closed default (`false`) and, only when the column is newly added, enables the nine named staff aliases when Auth is confirmed, unbanned, and the stored role/RT scope matches the alias. Other profiles remain inactive. On 2026-10-25, the SQL was first executed inside a transaction and rolled back; the validated migration was then applied through the Production SQL Editor. Post-check confirmed 9/9 target aliases active, zero role/scope mismatches, and zero active profiles outside the allowlist. No migration-ledger entry was created; retain this note as the record of the manual apply. Do not mark other profiles active without a separate account review.
