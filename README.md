# Aplikasi Digital RW 16 Nuansa Indah Ciomas

Aplikasi layanan administrasi warga berbasis Next.js App Router, React, TypeScript, Tailwind CSS, dan Supabase. Produk akhir yang dituju adalah Android APK dan iOS App; Vercel bukan dependency produksi yang ditetapkan. Source saat ini masih aplikasi Next.js dan belum menjadi aplikasi native atau backend-portable.

## Architecture

- `app/`: halaman dan API route Next.js.
- `components/`: komponen auth, navigasi, dan UI bersama.
- `lib/`: Supabase clients, auth helpers, data warga, tanggal, kas, dan PDF.
- `supabase/migrations/`: migrasi SQL; tidak dijalankan oleh build Next.js.
- Browser memakai Supabase publishable key. `lib/supabase/admin.ts` hanya untuk route handler server dan membaca secret key dari environment server.
- Sebagian fitur saat ini masih bergantung pada Next.js API route dan `SUPABASE_SECRET_KEY`. Karena itu source belum dapat berjalan sebagai aplikasi mobile mandiri tanpa server Next.js. Jangan memasukkan secret key ke bundle mobile. Sebelum native release, pindahkan operasi privileged ke backend yang terautentikasi (misalnya Supabase Edge Functions) atau ubah akses menjadi RPC/RLS yang aman; tutupi akses tersebut di service/repository boundary agar UI tidak terikat provider.
- Authenticated pages share `AppShell`, `PageHeader`, `NotificationBell`, and one role-aware five-slot mobile navigation. This source-level consistency has not yet passed screenshot QA against the supplied reference.

## Product and capacity decisions

- Target: Android APK and iOS App. Vercel may be used as a preview or optional web host, but it is not a required production component.
- Supabase Free is the initial backend baseline. Do not upgrade or migrate automatically. After about six months, assess actual database, storage, egress, monthly active users, performance, and reliability before choosing to stay, upgrade, or migrate.
- Planning capacity is 800 household accounts and approximately 2,400–4,000 residents across RT 01–06. This is a planning assumption, not a database cap or measured usage.
- Identity document photo uploads (KK/KTP/KIA/family photos) are out of scope for the initial release. Do not create public identity-document buckets. Forecasts such as 240 MB database/year, 500 MB storage, 4–6 GB egress, and 800 MAU are estimates only; measure actual usage in Supabase.
- Backend portability is an architectural requirement but is not yet implemented: pages still issue provider-specific Supabase queries. Keep future provider calls behind domain data services and avoid exposing provider-specific response shapes to UI components.

## Requirements and local setup

- Node.js 24 (testing uses Node's built-in TypeScript stripping) and npm.
- A Supabase project with the existing application schema and Auth configured.

```powershell
npm install
Copy-Item .env.example .env.local
# Fill the local values in .env.local using the project's authorized Supabase configuration.
npm run dev
```

Open `http://localhost:3000`. Do not commit `.env.local` or share its contents.

## Environment variables

See `.env.example` for variable names and placeholders. `SUPABASE_SECRET_KEY` is server-only and must never use a `NEXT_PUBLIC_` prefix or be imported by browser/mobile code. Configure secrets only in the authorized backend runtime. `NEXT_PUBLIC_SITE_URL` must match the origin used for password recovery; configure its redirect in Supabase Auth as well. No hosting provider is mandated by the locked mobile-first production architecture.

## Roles

- `WARGA`: one authenticated account associated with a household No. KK; access should be limited to that household.
- `RT`: resident and letter scope for the assigned RT.
- `RW`: RW-wide resident and letter review.
- `BENDAHARA`: cash, IPK, transactions, and reports.
- `ADMIN`: administrative access.

Client `RoleGate` components guide navigation. Database RLS and server route authorization remain the security boundaries; verify both after any policy or role change.

## Main routes

| Route | Purpose |
|---|---|
| `/login`, `/auth/reset-password` | Sign in and password recovery |
| `/` | Role-aware home/dashboard |
| `/menu` | Role-aware service menu |
| `/rt` | RT area summary/inbox count |
| `/warga`, `/warga/tambah`, `/warga/[id]`, `/warga/[id]/edit` | Resident management |
| `/surat`, `/surat/[id]`, `/buat-surat` | Letter list, detail, and request form |
| `/rw/surat`, `/rw/surat/[id]` | RW letter review and signature |
| `/kas`, `/kas/tambah`, `/kas/transaksi`, `/kas/ipk`, `/kas/laporan`, `/kas/rekap`, `/kas/pengaturan` | Cash management |
| `/pengaturan`, `/pengaturan/profil` | Application and profile settings |

Route API menyediakan login, pemulihan password, serta akses data warga/kategori yang dibatasi di server. Endpoint pendaftaran mandiri saat ini fail-closed: akun WARGA harus diverifikasi dan dihubungkan ke keluarga melalui provisioning tepercaya. Mutasi data lain memakai sesi Supabase terautentikasi dan tetap bergantung pada RLS; `RoleGate` di klien hanya membatasi navigasi/tampilan.

## Supabase setup and migrations

Review the existing database schema and RLS policies before applying a migration. The authorized read-only live audit on 2026-10-03 is recorded in `SUPABASE_LIVE_AUDIT.md`; it found local migrations absent from the live migration ledger, two required RPCs missing, and a surat trigger that permits skipping RW approval and trusts browser-supplied signer metadata. These SQL files are project-specific and are not executed by `npm run build`:

1. `supabase/migrations/202609280001_profiles_auth.sql`
2. Assign staff role/login ID/RT scope through an authorized administrator workflow.
3. `supabase/migrations/202609280002_data_access_rls.sql`
4. `supabase/migrations/202610010001_ipk_atomicity_and_signature_identity.sql` is a local, unapplied draft. It requires schema review and non-production SQL success/rollback tests before use.

Never apply these migrations to another Supabase project without reviewing its schema, existing policies, and project identity first. Do not disable RLS to resolve an application error. Confirm live schema and policies through the authorized Supabase session before declaring database security verified.

## Cash accounting rule

The opening balance is recorded explicitly for each month. The application does **not** automatically carry a closing balance into the next month. If a month's opening balance is missing, that month's closing balance is shown as unknown rather than treating the missing value as zero. Record the verified opening balance before relying on the closing balance in reports.

For a month with a recorded opening balance:

`Closing balance = opening balance + income - expenses`

IPK is stored by month and RT. The current local UI calls `save_kas_ipk_month` for atomic synchronization with linked cash transactions; that RPC is defined in the local draft `202610010001_ipk_atomicity_and_signature_identity.sql`. The inspected live database does not have this RPC, so a build that uses the current local IPK page against it is expected to fail until a reviewed migration is tested and applied. Do not claim live atomic IPK behavior.

## Development and verification

```powershell
npm run lint
npm test
npx tsc --noEmit --incremental false
npm run build
```

The current automated tests cover cash-balance calculations, role navigation, role and resident-scope decisions (including own-family and direct-ID scope), resident ID validation, category input/canonicalization, IPK RPC payload and safe aggregate calculations, surat transition decisions, and PDF signature/input prerequisites. They do not execute database RLS, API requests, SQL triggers/RPCs, actual letter transitions, PDF rendering, or live database flows. Those still require a PostgreSQL/Supabase test environment and must not be inferred from pure helper tests or a local build.

## Deployment

The database and release gates are documented in `supabase/README.md`, `DEPLOYMENT.md`, and `PRODUCTION_CHECKLIST.md`. Verify the authorized Supabase environment, Auth redirects, RLS, and role-specific journeys before release. Vercel is not a production gate for the Android/iOS product. Deployment is intentionally not triggered by local build commands.

## Android and iOS readiness

This repository currently contains a responsive Next.js web app, no `android/` or `ios/` project, and no Capacitor configuration or native packages. The current package identity is `aplikasi-rw`; it is not yet a native application identifier. A candidate shared reverse-DNS identifier is `id.nuansaindahciomas.rw16`, subject to owner approval and collision checks before creating native projects.

The current brand asset is `public/rw16-nuansa-indah.png`. The application uses browser Supabase Auth storage and generates surat PDFs in the browser with jsPDF. A WebView wrapper must validate persistent Auth storage, password recovery/deep links, file download/share behavior, camera-free signature canvas input, keyboard/safe-area layout, and external HTTPS navigation on physical devices. Do not add Capacitor plugins until those requirements and packaging target are approved. A remote Next.js origin wrapper would still require network access and would not provide offline operation. No native build has been attempted. iOS compilation/signing specifically requires macOS and Xcode.

See [RELEASE_READINESS.md](RELEASE_READINESS.md) for the internal done/verified/blocked/not-verified checklist.

See [PHASE2_ARCHITECTURE_AUDIT.md](PHASE2_ARCHITECTURE_AUDIT.md) for the current source/security/workflow audit, explicit blockers, and next actions under the locked Android/iOS architecture.
See [PHASE3_STAGING_EXECUTION_REPORT.md](PHASE3_STAGING_EXECUTION_REPORT.md) for the latest staging, migration reconciliation, RPC, RLS/IDOR, surat/PDF, and mobile-backend status. The inventory SQL is read-only and must only be run after confirming a disposable project.

Release operations and gates are documented separately: [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md), [RELEASE_READINESS.md](RELEASE_READINESS.md), [ROLE_QA_MATRIX.md](ROLE_QA_MATRIX.md), [DATABASE_READINESS.md](DATABASE_READINESS.md), [DEPLOYMENT.md](DEPLOYMENT.md), [SECURITY.md](SECURITY.md), [ROLLBACK.md](ROLLBACK.md), [ANDROID_RELEASE.md](ANDROID_RELEASE.md), and [IOS_RELEASE.md](IOS_RELEASE.md). These are preparation documents only; they do not indicate that hosting, database, or native releases have been verified.

## Maintenance

- Keep local secrets in ignored environment files or the hosting provider's secret store.
- Review RLS and role authorization whenever changing database access or API handlers.
- Preserve migrations and record the exact Supabase project/environment where they are applied.
- Run tests, lint, typecheck, build, and browser QA before a release; test critical flows with dedicated test accounts and non-production data.
