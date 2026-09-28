-- Production migration for the aplikasi-rw Supabase project. It does not drop
-- application data and replaces only the audited legacy policies named below.
do $$
declare
  required_table text;
begin
  foreach required_table in array array[
    'profiles', 'warga', 'warga_kategori', 'kategori_warga', 'surat',
    'kas_kategori', 'kas_transaksi', 'kas_ipk', 'kas_saldo_awal'
  ] loop
    if to_regclass('public.' || required_table) is null then
      raise exception 'RLS draft berhenti: tabel public.% tidak ditemukan.', required_table;
    end if;
  end loop;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='warga' and column_name='no_kk')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='warga' and column_name='rt')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='surat' and column_name='warga_id')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='surat' and column_name='status')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='surat' and column_name='ttd_rt')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='surat' and column_name='ttd_rw') then
    raise exception 'RLS draft berhenti: kolom relasi warga/surat tidak sesuai dengan query aplikasi.';
  end if;

  if exists (
    select 1 from pg_policies p
    where p.schemaname = 'public'
      and p.tablename in ('warga', 'warga_kategori', 'kategori_warga', 'surat', 'kas_kategori', 'kas_transaksi', 'kas_ipk', 'kas_saldo_awal')
      and p.policyname not in (
        'allow select kategori warga', 'Allow public insert surat', 'allow insert surat',
        'allow insert warga', 'allow select warga', 'allow insert warga kategori', 'allow select warga kategori',
        'warga_select_scoped', 'warga_insert_staff', 'warga_update_staff', 'warga_delete_staff',
        'warga_kategori_select_scoped', 'warga_kategori_manage_staff',
        'kategori_warga_select_authenticated', 'kategori_warga_manage_rw',
        'surat_select_scoped', 'surat_insert_warga', 'surat_update_rt', 'surat_update_rw',
        'kas_kategori_bendahara_all', 'kas_transaksi_bendahara_all', 'kas_ipk_bendahara_all', 'kas_saldo_awal_bendahara_all'
      )
  ) then
    raise exception 'RLS draft berhenti: ditemukan policy lama pada tabel aplikasi. Audit policy lama agar tidak tertinggal akses yang terlalu luas.';
  end if;
end $$;

-- Remove the audited legacy anon policies that granted public read/insert.
drop policy if exists "allow select kategori warga" on public.kategori_warga;
drop policy if exists "Allow public insert surat" on public.surat;
drop policy if exists "allow insert surat" on public.surat;
drop policy if exists "allow insert warga" on public.warga;
drop policy if exists "allow select warga" on public.warga;
drop policy if exists "allow insert warga kategori" on public.warga_kategori;
drop policy if exists "allow select warga kategori" on public.warga_kategori;

create or replace function public.app_current_role()
returns text
language sql stable security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = (select auth.uid())
$$;

create or replace function public.app_current_kk()
returns text
language sql stable security definer
set search_path = ''
as $$
  select p.no_kk from public.profiles p where p.id = (select auth.uid())
$$;

create or replace function public.app_current_rt()
returns text
language sql stable security definer
set search_path = ''
as $$
  select p.rt from public.profiles p where p.id = (select auth.uid())
$$;

create or replace function public.app_can_access_warga(p_warga_id bigint)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.warga w
    join public.profiles p on p.id = (select auth.uid())
    where w.id = p_warga_id
      and (
        p.role in ('RW', 'ADMIN')
        or (p.role = 'RT' and w.rt::text = p.rt)
        or (p.role = 'WARGA' and w.no_kk::text = p.no_kk)
      )
  )
$$;

revoke all on function public.app_current_role() from public, anon;
revoke all on function public.app_current_kk() from public, anon;
revoke all on function public.app_current_rt() from public, anon;
revoke all on function public.app_can_access_warga(bigint) from public, anon;
grant execute on function public.app_current_role() to authenticated;
grant execute on function public.app_current_kk() to authenticated;
grant execute on function public.app_current_rt() to authenticated;
grant execute on function public.app_can_access_warga(bigint) to authenticated;

alter table public.warga enable row level security;
drop policy if exists warga_select_scoped on public.warga;
create policy warga_select_scoped on public.warga for select to authenticated
  using (public.app_can_access_warga(id::bigint));
drop policy if exists warga_insert_staff on public.warga;
create policy warga_insert_staff on public.warga for insert to authenticated
  with check (
    (public.app_current_role() = 'RT' and rt::text = public.app_current_rt())
    or public.app_current_role() in ('RW', 'ADMIN')
  );
drop policy if exists warga_update_staff on public.warga;
create policy warga_update_staff on public.warga for update to authenticated
  using (
    (public.app_current_role() = 'RT' and rt::text = public.app_current_rt())
    or public.app_current_role() in ('RW', 'ADMIN')
  )
  with check (
    (public.app_current_role() = 'RT' and rt::text = public.app_current_rt())
    or public.app_current_role() in ('RW', 'ADMIN')
  );
drop policy if exists warga_delete_staff on public.warga;
create policy warga_delete_staff on public.warga for delete to authenticated
  using (public.app_current_role() in ('RW', 'ADMIN'));

alter table public.warga_kategori enable row level security;
drop policy if exists warga_kategori_select_scoped on public.warga_kategori;
create policy warga_kategori_select_scoped on public.warga_kategori for select to authenticated
  using (public.app_can_access_warga(warga_id::bigint));
drop policy if exists warga_kategori_manage_staff on public.warga_kategori;
create policy warga_kategori_manage_staff on public.warga_kategori for all to authenticated
  using (
    public.app_current_role() in ('RW', 'ADMIN')
    or (public.app_current_role() = 'RT' and public.app_can_access_warga(warga_id::bigint))
  )
  with check (
    public.app_current_role() in ('RW', 'ADMIN')
    or (public.app_current_role() = 'RT' and public.app_can_access_warga(warga_id::bigint))
  );

alter table public.kategori_warga enable row level security;
drop policy if exists kategori_warga_select_authenticated on public.kategori_warga;
create policy kategori_warga_select_authenticated on public.kategori_warga for select to authenticated
  using (public.app_current_role() in ('WARGA', 'RT', 'RW', 'BENDAHARA', 'ADMIN'));
drop policy if exists kategori_warga_manage_rw on public.kategori_warga;
create policy kategori_warga_manage_rw on public.kategori_warga for all to authenticated
  using (public.app_current_role() in ('RW', 'ADMIN'))
  with check (public.app_current_role() in ('RW', 'ADMIN'));

alter table public.surat enable row level security;
drop policy if exists surat_select_scoped on public.surat;
create policy surat_select_scoped on public.surat for select to authenticated
  using (public.app_can_access_warga(warga_id::bigint));
drop policy if exists surat_insert_warga on public.surat;
create policy surat_insert_warga on public.surat for insert to authenticated
  with check (
    public.app_current_role() = 'WARGA'
    and public.app_can_access_warga(warga_id::bigint)
    and status = 'DRAFT'
    and coalesce(ttd_rt, false) = false
    and coalesce(ttd_rw, false) = false
    and rt::text = (
      select w.rt::text from public.warga w where w.id::bigint = surat.warga_id::bigint
    )
  );
drop policy if exists surat_update_rt on public.surat;
create policy surat_update_rt on public.surat for update to authenticated
  using (
    public.app_current_role() = 'RT'
    and rt::text = public.app_current_rt()
    and status = 'DRAFT'
  )
  with check (
    public.app_current_role() = 'RT'
    and rt::text = public.app_current_rt()
    and status = 'MENUNGGU_RW'
    and ttd_rt is true
  );
drop policy if exists surat_update_rw on public.surat;
create policy surat_update_rw on public.surat for update to authenticated
  using (
    public.app_current_role() in ('RW', 'ADMIN')
    and status in ('MENUNGGU_RW', 'DISETUJUI')
  )
  with check (
    public.app_current_role() in ('RW', 'ADMIN')
    and (
      status in ('DISETUJUI', 'DITOLAK')
      or (status = 'TERBIT' and ttd_rw is true)
    )
  );

-- Restrict edits on surat to the columns actually changed by the KK/RT/RW flows.
revoke update on public.surat from authenticated;
grant update (status, ditolak_alasan, ttd_rt, ttd_rt_at, ttd_rt_nama, ttd_rt_gambar,
              ttd_rw, ttd_rw_at, ttd_rw_nama, ttd_rw_gambar)
  on public.surat to authenticated;

create or replace function public.guard_surat_update_by_role()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_role text := (select p.role from public.profiles p where p.id = (select auth.uid()));
begin
  -- Service-role maintenance does not carry a user JWT and bypasses client RLS.
  if v_role is null or v_role = 'ADMIN' then
    return new;
  elsif v_role = 'RT' then
    if (to_jsonb(new) - array['status', 'ttd_rt', 'ttd_rt_at', 'ttd_rt_nama', 'ttd_rt_gambar'])
       is distinct from
       (to_jsonb(old) - array['status', 'ttd_rt', 'ttd_rt_at', 'ttd_rt_nama', 'ttd_rt_gambar'])
       or old.status is distinct from 'DRAFT'
       or new.status is distinct from 'MENUNGGU_RW'
       or new.ttd_rt is not true
       or nullif(trim(new.ttd_rt_nama), '') is null
       or new.ttd_rt_at is null
       or nullif(new.ttd_rt_gambar, '') is null then
      raise exception 'RT hanya dapat memberikan TTD dan meneruskan surat dalam wilayah tugasnya.';
    end if;
    return new;
  elsif v_role = 'RW' then
    if (to_jsonb(new) - array['status', 'ditolak_alasan', 'ttd_rw', 'ttd_rw_at', 'ttd_rw_nama', 'ttd_rw_gambar'])
       is distinct from
       (to_jsonb(old) - array['status', 'ditolak_alasan', 'ttd_rw', 'ttd_rw_at', 'ttd_rw_nama', 'ttd_rw_gambar'])
       or old.status is null or old.status not in ('MENUNGGU_RW', 'DISETUJUI')
       or new.status is null or new.status not in ('DISETUJUI', 'DITOLAK', 'TERBIT')
       or (new.status <> 'TERBIT' and (
         new.ttd_rw is distinct from old.ttd_rw
         or new.ttd_rw_at is distinct from old.ttd_rw_at
         or new.ttd_rw_nama is distinct from old.ttd_rw_nama
         or new.ttd_rw_gambar is distinct from old.ttd_rw_gambar
       ))
       or (new.status = 'TERBIT' and (
         new.ttd_rw is not true
         or new.ttd_rw_at is null
         or nullif(trim(new.ttd_rw_nama), '') is null
         or nullif(new.ttd_rw_gambar, '') is null
       ))
       or (new.status = 'DITOLAK' and nullif(trim(new.ditolak_alasan), '') is null) then
      raise exception 'RW hanya dapat meninjau dan menandatangani surat yang masuk ke inbox RW.';
    end if;
    return new;
  end if;

  raise exception 'Role ini tidak berhak mengubah surat.';
end;
$$;

revoke all on function public.guard_surat_update_by_role() from public, anon, authenticated;
drop trigger if exists guard_surat_update_by_role on public.surat;
create trigger guard_surat_update_by_role
  before update on public.surat
  for each row execute function public.guard_surat_update_by_role();

do $$
declare
  kas_table text;
begin
  foreach kas_table in array array['kas_kategori', 'kas_transaksi', 'kas_ipk', 'kas_saldo_awal'] loop
    execute format('alter table public.%I enable row level security', kas_table);
    execute format('drop policy if exists %I on public.%I', kas_table || '_bendahara_all', kas_table);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.app_current_role() in (''BENDAHARA'', ''ADMIN'')) with check (public.app_current_role() in (''BENDAHARA'', ''ADMIN''))',
      kas_table || '_bendahara_all', kas_table
    );
  end loop;
end $$;
