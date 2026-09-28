# Supabase setup for aplikasi-rw

These migrations target only the RW 16 project configured for this checkout. They are not executed by `npm run build`.

## Production database status

The migrations below were applied to the aplikasi-rw Supabase project (`qspglnzoayczbpgmhsnh`) on 2026-09-28. Verification confirmed the expected profile columns and signup trigger, RLS enabled on all nine application tables, no remaining anonymous policies, and role counts of 2 ADMIN, 1 BENDAHARA, 6 RT, and 1 RW. Resident category rows were preserved, including Lansia, Balita, Anak, Disabilitas, Pelajar, Penerima Bantuan, and Penerima Zakat.

The migrations preserve application data. Migration `202609280001_profiles_auth.sql` adds the account/profile columns while preserving existing rows and maps the legacy role `Administrator` to `ADMIN`. Migration `202609280002_data_access_rls.sql` replaces only the audited legacy public policies, then scopes warga, surat, and kas access by role and RT. It stops on unexpected policies rather than disabling RLS.

Never run these migrations against Kingz Barbershop. If a fresh RW environment is created, verify the project reference and current policies first, then apply in order:

1. `202609280001_profiles_auth.sql` adds the auth/profile columns, self-only profile access, and the validated KK signup trigger.
2. Assign each staff Auth user an administrator-chosen `login_id`, role, and (for RT) RT scope in `public.profiles`.
3. `202609280002_data_access_rls.sql` scopes residents, surat, and kas access by role and RT, and guards surat status/signature changes.

## Staff account assignment

Create the staff Auth user through a trusted administrator workflow, then assign its profile. Use an email matching the synthetic staff login convention, `<login_id>@rw16.invalid`, because staff login IDs are resolved to that Auth email.

```sql
insert into public.profiles (id, role, login_id, rt)
select id, 'RT', 'RT-01', '01'
from auth.users
where lower(email) = lower('rt-01@rw16.invalid');
```

Use `RW`, `BENDAHARA`, or `ADMIN` for other staff accounts. Keep RT scope server-controlled; account holders may update their display name, NIK, phone, and password but not their role, login ID, or RT scope.

## Local environment

The local `.env.local` supplies the RW Supabase URL, publishable key, and server-only secret key. Never print, commit, or expose the secret key in browser code. Password recovery also requires `NEXT_PUBLIC_SITE_URL` set to the trusted application origin, plus the matching redirect URL configured in Supabase Auth.

Deploy environment variables must be configured for the aplikasi-rw Vercel project separately. This checkout has no Vercel project link or CLI login, so verify the project identity and environment values before deploying.
