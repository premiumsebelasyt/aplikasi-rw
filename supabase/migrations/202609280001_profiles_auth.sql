-- Additive migration for the aplikasi-rw project. This never drops or replaces
-- the existing profiles table or its rows.

do $$
begin
  if to_regclass('public.warga') is null then
    raise exception 'Migration berhenti: tabel public.warga tidak ditemukan.';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'warga' and column_name = 'no_kk'
  ) then
    raise exception 'Migration berhenti: kolom public.warga.no_kk tidak ditemukan.';
  end if;

  if to_regclass('public.profiles') is not null and not (
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'id' and udt_name = 'uuid')
    and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'role')
  ) then
    raise exception 'Migration berhenti: public.profiles harus memiliki id UUID dan role. Tidak ada tabel atau data yang diubah.';
  end if;

  if to_regclass('public.profiles') is not null and not exists (
    select 1
    from pg_index i
    join pg_attribute a on a.attrelid = i.indrelid and a.attnum = i.indkey[0]
    where i.indrelid = 'public.profiles'::regclass
      and i.indisunique
      and i.indpred is null
      and i.indnatts = 1
      and a.attname = 'id'
  ) then
    raise exception 'Migration berhenti: public.profiles.id harus unik sebelum dipakai sebagai identitas akun.';
  end if;

  if exists (
    select 1 from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = 'profiles'
      and p.policyname not in ('profiles_select_own', 'profiles_update_own')
  ) then
    raise exception 'Migration berhenti: ditemukan policy lama pada public.profiles. Audit dan rapikan policy sebelum melanjutkan.';
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('WARGA', 'RT', 'RW', 'BENDAHARA', 'ADMIN')),
  no_kk text,
  login_id text,
  rt text,
  nama_lengkap text,
  nik text,
  no_hp text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Existing RW deployment uses profiles(id, nama, role, rt). Add fields used by
-- account recovery and profile editing while retaining all existing columns.
alter table public.profiles
  add column if not exists nama text,
  add column if not exists no_kk text,
  add column if not exists login_id text,
  add column if not exists nama_lengkap text,
  add column if not exists nik text,
  add column if not exists no_hp text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.profiles
set nama_lengkap = nullif(trim(nama), '')
where nama_lengkap is null and nullif(trim(nama), '') is not null;

-- The legacy label is an existing administrator account; use the app's
-- canonical role string so every role gate and RLS policy recognizes it.
update public.profiles set role = 'ADMIN' where role = 'Administrator';

create unique index if not exists profiles_warga_no_kk_unique
  on public.profiles (no_kk)
  where role = 'WARGA' and no_kk is not null;

create unique index if not exists profiles_staff_login_id_unique
  on public.profiles (lower(login_id))
  where login_id is not null;

alter table public.profiles enable row level security;
revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (nama, nama_lengkap, nik, no_hp) on table public.profiles to authenticated;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create or replace function public.create_warga_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_no_kk text := nullif(trim(new.raw_user_meta_data ->> 'no_kk'), '');
  v_no_hp text := nullif(trim(new.raw_user_meta_data ->> 'no_hp'), '');
begin
  -- Accounts created by an administrator without a KK are staff accounts;
  -- staff role and login_id must be assigned separately by an administrator.
  if v_no_kk is null then
    return new;
  end if;

  if v_no_kk !~ '^[0-9]{16}$' then
    raise exception 'Nomor KK harus terdiri dari 16 digit.';
  end if;

  if not exists (
    select 1 from public.warga w where w.no_kk::text = v_no_kk
  ) then
    raise exception 'Nomor KK tidak terdaftar.';
  end if;

  insert into public.profiles (id, role, no_kk, no_hp)
  values (new.id, 'WARGA', v_no_kk, v_no_hp)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_warga_profile on auth.users;
create trigger on_auth_user_created_warga_profile
  after insert on auth.users
  for each row execute function public.create_warga_profile_for_auth_user();
