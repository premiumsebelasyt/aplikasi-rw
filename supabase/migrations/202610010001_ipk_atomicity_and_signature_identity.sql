-- Local draft: atomic IPK-to-cash synchronization and server-derived signer names.
-- Apply only after verifying the authorized RW Supabase project and reviewing its schema.

do $$
declare
  required_column text;
begin
  if to_regclass('public.kas_ipk') is null
     or to_regclass('public.kas_transaksi') is null
     or to_regclass('public.kas_kategori') is null
     or to_regclass('public.kategori_warga') is null
     or to_regclass('public.warga_kategori') is null
     or to_regclass('public.warga') is null
     or to_regclass('public.profiles') is null
     or to_regclass('public.surat') is null then
    raise exception 'Migration berhenti: tabel warga/profil/surat/kategori/kas belum lengkap.';
  end if;
  foreach required_column in array array[
    'public.kas_ipk.id','public.kas_ipk.bulan','public.kas_ipk.rt','public.kas_ipk.terkumpul',
    'public.kas_transaksi.id','public.kas_transaksi.kas_ipk_id','public.kas_transaksi.tanggal',
    'public.kas_transaksi.jenis','public.kas_transaksi.kategori_id','public.kas_transaksi.keterangan',
    'public.kas_transaksi.nominal','public.kas_transaksi.rt','public.kas_transaksi.sumber',
    'public.kas_kategori.id','public.kas_kategori.nama','public.kas_kategori.jenis',
    'public.kategori_warga.id','public.kategori_warga.nama','public.warga_kategori.warga_id',
    'public.warga_kategori.kategori_id','public.warga.id','public.warga.nik','public.warga.no_kk',
    'public.warga.nama','public.warga.alamat','public.warga.rt','public.warga.status_warga',
    'public.profiles.id','public.profiles.role','public.profiles.rt','public.profiles.nama','public.profiles.nama_lengkap',
    'public.surat.status','public.surat.ttd_rt','public.surat.ttd_rt_at','public.surat.ttd_rt_nama',
    'public.surat.ttd_rt_gambar','public.surat.ttd_rw','public.surat.ttd_rw_at','public.surat.ttd_rw_nama',
    'public.surat.ttd_rw_gambar','public.surat.ditolak_alasan'
  ] loop
    if not exists (
      select 1 from information_schema.columns c
      where c.table_schema = split_part(required_column, '.', 1)
        and c.table_name = split_part(required_column, '.', 2)
        and c.column_name = split_part(required_column, '.', 3)
    ) then
      raise exception 'Migration berhenti: kolom % tidak ditemukan.', required_column;
    end if;
  end loop;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.kas_ipk'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%(bulan, rt)%'
  ) and not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'kas_ipk'
      and indexdef ilike '%unique%(%bulan, rt)%'
  ) then
    raise exception 'Migration berhenti: kas_ipk memerlukan unique key (bulan, rt) yang dipakai model aplikasi.';
  end if;

  -- Each IPK month/RT must map to no more than one cash transaction, and every
  -- link must reference a real IPK row. Fail before installing guards if the
  -- existing data needs a deliberate owner-led repair.
  if exists (
    select 1
    from public.kas_transaksi t
    left join public.kas_ipk i on i.id = t.kas_ipk_id
    where t.kas_ipk_id is not null and i.id is null
  ) then
    raise exception 'Migration berhenti: kas_transaksi memiliki kas_ipk_id yatim; audit data sebelum melanjutkan.';
  end if;
  if exists (
    select 1 from public.kas_transaksi
    where kas_ipk_id is not null
    group by kas_ipk_id having count(*) > 1
  ) then
    raise exception 'Migration berhenti: satu IPK memiliki beberapa transaksi kas; audit duplikasi sebelum melanjutkan.';
  end if;
  if (select a.atttypid from pg_catalog.pg_attribute a
      where a.attrelid = 'public.kas_ipk'::regclass and a.attname = 'id' and not a.attisdropped)
     is distinct from
     (select a.atttypid from pg_catalog.pg_attribute a
      where a.attrelid = 'public.kas_transaksi'::regclass and a.attname = 'kas_ipk_id' and not a.attisdropped) then
    raise exception 'Migration berhenti: tipe kas_ipk.id dan kas_transaksi.kas_ipk_id berbeda.';
  end if;
  if pg_catalog.to_regprocedure('public.app_current_role()') is null then
    raise exception 'Migration berhenti: public.app_current_role() tidak ditemukan; jalankan dan audit migrasi RLS terlebih dahulu.';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_trigger t
    where t.tgrelid = 'public.surat'::regclass
      and t.tgname = 'guard_surat_update_by_role'
      and not t.tgisinternal
      and t.tgenabled <> 'D'
  ) then
    raise exception 'Migration berhenti: trigger guard_surat_update_by_role tidak ditemukan; jalankan migrasi RLS terlebih dahulu.';
  end if;
end $$;

-- Install only missing referential/uniqueness guarantees. Existing equivalent
-- constraints/indexes are retained; this draft does not reconcile live data.
do $$
declare
  ipk_id_attnum smallint;
  transaction_ipk_attnum smallint;
begin
  select attnum into ipk_id_attnum from pg_catalog.pg_attribute
  where attrelid = 'public.kas_ipk'::regclass and attname = 'id' and not attisdropped;
  select attnum into transaction_ipk_attnum from pg_catalog.pg_attribute
  where attrelid = 'public.kas_transaksi'::regclass and attname = 'kas_ipk_id' and not attisdropped;

  if exists (
    select 1 from pg_catalog.pg_constraint c
    where c.conrelid = 'public.kas_transaksi'::regclass
      and c.confrelid = 'public.kas_ipk'::regclass
      and c.contype = 'f'
      and c.conkey = array[transaction_ipk_attnum]::smallint[]
      and c.confkey = array[ipk_id_attnum]::smallint[]
      and c.confdeltype not in ('a', 'r')
  ) then
    raise exception 'Migration berhenti: foreign key kas IPK yang ada menghapus transaksi tertaut secara otomatis; tinjau aturan retensi data.';
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint c
    where c.conrelid = 'public.kas_transaksi'::regclass
      and c.confrelid = 'public.kas_ipk'::regclass
      and c.contype = 'f'
      and c.conkey = array[transaction_ipk_attnum]::smallint[]
      and c.confkey = array[ipk_id_attnum]::smallint[]
  ) then
    alter table public.kas_transaksi
      add constraint kas_transaksi_kas_ipk_id_fkey
      foreign key (kas_ipk_id) references public.kas_ipk(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_catalog.pg_index i
    where i.indrelid = 'public.kas_transaksi'::regclass
      and i.indisunique and i.indnkeyatts = 1
      and i.indkey[0] = transaction_ipk_attnum
      and (
        i.indpred is null
        or pg_catalog.pg_get_expr(i.indpred, i.indrelid) ilike '%kas_ipk_id IS NOT NULL%'
      )
  ) then
    create unique index kas_transaksi_kas_ipk_id_uidx
      on public.kas_transaksi (kas_ipk_id)
      where kas_ipk_id is not null;
  end if;
end $$;

-- Add missing canonical categories while preserving every existing category row
-- and relation. The API presents known aliases as their canonical labels.
do $$
begin
  lock table public.kategori_warga in share row exclusive mode;
  insert into public.kategori_warga (nama)
  select wanted.nama
  from (values
    ('Lansia'), ('Balita'), ('Anak-anak'), ('Remaja'), ('Dewasa'),
    ('Penyandang Disabilitas'), ('Ibu Hamil'), ('Lainnya')
  ) as wanted(nama)
  where not exists (
    select 1 from public.kategori_warga current_category
    where lower(trim(current_category.nama)) = lower(wanted.nama)
  );
end $$;

create or replace function public.save_warga_with_categories(
  p_actor_id uuid,
  p_warga_id bigint,
  p_warga jsonb,
  p_category_ids bigint[]
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
  v_existing public.warga%rowtype;
  v_warga_id bigint;
  v_rt_digits text;
  v_rt text;
  v_column text;
  v_columns text := '';
  v_values text := '';
  v_setters text := '';
  v_sql text;
  v_category_count bigint;
begin
  if p_actor_id is null or pg_catalog.jsonb_typeof(p_warga) is distinct from 'object' then
    raise exception 'Data warga atau identitas akun tidak valid.' using errcode = '22023';
  end if;

  select * into v_profile
  from public.profiles
  where id = p_actor_id;
  if not found or coalesce(v_profile.role, '') not in ('RT', 'RW', 'ADMIN') then
    raise exception 'Role ini tidak boleh mengelola data warga.' using errcode = '42501';
  end if;

  if p_warga_id is not null then
    select * into v_existing from public.warga where id = p_warga_id;
    if not found then raise exception 'Data warga tidak ditemukan.' using errcode = 'P0002'; end if;
    if v_profile.role = 'RT' then
      v_rt_digits := pg_catalog.regexp_replace(coalesce(v_profile.rt, ''), '[^0-9]', '', 'g');
      v_rt := pg_catalog.right(pg_catalog.lpad(v_rt_digits, 2, '0'), 2);
      if coalesce(v_rt, '') not in ('01','02','03','04','05','06')
         or pg_catalog.right(pg_catalog.lpad(pg_catalog.regexp_replace(coalesce(v_existing.rt::text, ''), '[^0-9]', '', 'g'), 2, '0'), 2) <> v_rt then
        raise exception 'Data warga berada di luar wilayah tugas RT.' using errcode = '42501';
      end if;
    end if;
  end if;

  if v_profile.role = 'RT' then
    v_rt_digits := pg_catalog.regexp_replace(coalesce(v_profile.rt, ''), '[^0-9]', '', 'g');
    v_rt := pg_catalog.right(pg_catalog.lpad(v_rt_digits, 2, '0'), 2);
  elsif p_warga ? 'rt' then
    v_rt_digits := pg_catalog.regexp_replace(coalesce(p_warga ->> 'rt', ''), '[^0-9]', '', 'g');
    v_rt := pg_catalog.right(pg_catalog.lpad(v_rt_digits, 2, '0'), 2);
  elsif v_existing.id is not null then
    v_rt_digits := pg_catalog.regexp_replace(coalesce(v_existing.rt::text, ''), '[^0-9]', '', 'g');
    v_rt := pg_catalog.right(pg_catalog.lpad(v_rt_digits, 2, '0'), 2);
  else
    v_rt := null;
  end if;
  if coalesce(v_rt, '') not in ('01','02','03','04','05','06') then
    raise exception 'RT warga tidak valid.' using errcode = '22023';
  end if;

  if p_warga_id is null and (
    nullif(pg_catalog.btrim(p_warga ->> 'nik'), '') is null
    or nullif(pg_catalog.btrim(p_warga ->> 'nama'), '') is null
    or nullif(pg_catalog.btrim(p_warga ->> 'alamat'), '') is null
  ) then
    raise exception 'NIK, nama, dan alamat wajib diisi.' using errcode = '22023';
  end if;
  if p_warga ? 'nik' and (
    pg_catalog.jsonb_typeof(p_warga -> 'nik') is distinct from 'string'
    or coalesce(p_warga ->> 'nik', '') !~ '^[0-9]{16}$'
  ) then
    raise exception 'NIK harus terdiri dari 16 digit.' using errcode = '22023';
  end if;
  if p_warga ? 'no_kk' and (
    pg_catalog.jsonb_typeof(p_warga -> 'no_kk') not in ('string', 'null')
    or (nullif(pg_catalog.btrim(p_warga ->> 'no_kk'), '') is not null and p_warga ->> 'no_kk' !~ '^[0-9]{16}$')
  ) then
    raise exception 'Nomor KK harus kosong atau terdiri dari 16 digit.' using errcode = '22023';
  end if;

  if p_category_ids is not null then
    if exists (select 1 from pg_catalog.unnest(p_category_ids) as categories(category_id) where category_id is null or category_id < 1)
       or pg_catalog.cardinality(p_category_ids) <> (select count(distinct category_id) from pg_catalog.unnest(p_category_ids) as categories(category_id)) then
      raise exception 'Daftar kategori warga tidak valid.' using errcode = '22023';
    end if;
    select count(*) into v_category_count
    from public.kategori_warga
    where id = any(p_category_ids);
    if v_category_count <> pg_catalog.cardinality(p_category_ids) then
      raise exception 'Satu atau lebih kategori warga tidak ditemukan.' using errcode = '23503';
    end if;
  end if;

  if p_warga_id is null then
    if not (p_warga ? 'nik' and p_warga ? 'nama' and p_warga ? 'alamat') then
      raise exception 'NIK, nama, dan alamat wajib diisi.' using errcode = '22023';
    end if;
    foreach v_column in array array[
      'nik','no_kk','nama','alamat','jenis_kelamin','tempat_lahir','tanggal_lahir',
      'agama','status_perkawinan','no_hp','pendidikan','pekerjaan','status_tinggal'
    ] loop
      if p_warga ? v_column then
        v_columns := v_columns || case when v_columns = '' then '' else ', ' end || pg_catalog.quote_ident(v_column);
        v_values := v_values || case when v_values = '' then '' else ', ' end ||
          pg_catalog.format('(pg_catalog.jsonb_populate_record(null::public.warga, $1)).%I', v_column);
      end if;
    end loop;
    if v_columns = '' then raise exception 'Data warga kosong.' using errcode = '22023'; end if;
    v_sql := pg_catalog.format(
      'insert into public.warga (%s, rt, status_warga) select %s, $2, ''Aktif'' returning id',
      v_columns, v_values
    );
    execute v_sql into v_warga_id using p_warga, v_rt;
  else
    foreach v_column in array array[
      'nik','no_kk','nama','alamat','jenis_kelamin','tempat_lahir','tanggal_lahir',
      'agama','status_perkawinan','no_hp','pendidikan','pekerjaan','status_tinggal','status_warga'
    ] loop
      if p_warga ? v_column then
        v_setters := v_setters || case when v_setters = '' then '' else ', ' end ||
          pg_catalog.format('%I = (pg_catalog.jsonb_populate_record(null::public.warga, $1)).%I', v_column, v_column);
      end if;
    end loop;
    v_sql := 'update public.warga set rt = $2' ||
      case when v_setters = '' then '' else ', ' || v_setters end ||
      ' where id = $3 returning id';
    execute v_sql into v_warga_id using p_warga, v_rt, p_warga_id;
  end if;

  if p_category_ids is not null then
    delete from public.warga_kategori where warga_id = v_warga_id;
    if pg_catalog.cardinality(p_category_ids) > 0 then
      insert into public.warga_kategori (warga_id, kategori_id)
      select v_warga_id, category_id from pg_catalog.unnest(p_category_ids) as categories(category_id);
    end if;
  end if;

  return v_warga_id;
end;
$$;

revoke all on function public.save_warga_with_categories(uuid, bigint, jsonb, bigint[]) from public, anon, authenticated;
grant execute on function public.save_warga_with_categories(uuid, bigint, jsonb, bigint[]) to service_role;

create or replace function public.save_kas_ipk_month(p_bulan date, p_rows jsonb)
returns setof public.kas_ipk
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := public.app_current_role();
  v_row jsonb;
  v_rt text;
  v_amount numeric;
  v_description text;
  v_ipk public.kas_ipk%rowtype;
  v_category_id bigint;
  v_existing_id bigint;
  v_existing_count integer;
begin
  if coalesce(v_role, '') not in ('BENDAHARA', 'ADMIN') then
    raise exception 'Role ini tidak berhak menyimpan IPK.' using errcode = '42501';
  end if;
  if p_bulan is null or extract(day from p_bulan) <> 1 then
    raise exception 'Bulan IPK harus menggunakan tanggal pertama bulan.';
  end if;

  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) <> 6 then
    raise exception 'IPK harus berisi tepat enam data RT.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_rows) e
    where coalesce(e ->> 'rt', '') not in ('01','02','03','04','05','06')
       or coalesce(e ->> 'terkumpul', '') !~ '^[0-9]+$'
  ) or (select count(distinct e ->> 'rt') from jsonb_array_elements(p_rows) e) <> 6 then
    raise exception 'Data IPK harus memiliki satu nilai bulat nonnegatif untuk setiap RT 01 sampai 06.';
  end if;

  -- Serialize saves for this month; the function call itself is one DB transaction.
  perform pg_advisory_xact_lock(hashtext('save_kas_ipk_month'), hashtext(p_bulan::text));

  select id into v_category_id
  from public.kas_kategori
  where lower(trim(nama)) = 'ipk bulanan'
    and jenis = 'PEMASUKAN'
  order by id
  limit 1;
  if v_category_id is null then
    raise exception 'Kategori pemasukan IPK Bulanan belum tersedia.';
  end if;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_rt := v_row ->> 'rt';
    v_amount := (v_row ->> 'terkumpul')::numeric;
    v_description := v_row ->> 'keterangan';
    if v_amount < 0 or v_amount > 9007199254740991 or nullif(trim(v_description), '') is null then
      raise exception 'Nilai dan keterangan IPK untuk RT % tidak valid.', v_rt;
    end if;

    insert into public.kas_ipk (bulan, rt, terkumpul)
    values (p_bulan, v_rt, v_amount)
    on conflict (bulan, rt) do update set terkumpul = excluded.terkumpul
    returning * into v_ipk;

    select count(*) into v_existing_count
    from public.kas_transaksi
    where kas_ipk_id = v_ipk.id;
    if v_existing_count > 1 then
      raise exception 'Lebih dari satu transaksi kas terhubung dengan IPK RT %; audit duplikasi sebelum menyimpan.', v_rt;
    elsif v_amount > 0 and v_existing_count = 1 then
      select id into v_existing_id
      from public.kas_transaksi
      where kas_ipk_id = v_ipk.id;
      update public.kas_transaksi
      set tanggal = p_bulan,
          jenis = 'PEMASUKAN',
          kategori_id = v_category_id,
          keterangan = v_description,
          nominal = v_amount,
          rt = v_rt,
          sumber = 'IPK Warga'
      where id = v_existing_id;
    elsif v_amount > 0 then
      insert into public.kas_transaksi
        (kas_ipk_id, tanggal, jenis, kategori_id, keterangan, nominal, rt, sumber)
      values
        (v_ipk.id, p_bulan, 'PEMASUKAN', v_category_id, v_description, v_amount, v_rt, 'IPK Warga');
    elsif v_existing_count = 1 then
      select id into v_existing_id
      from public.kas_transaksi
      where kas_ipk_id = v_ipk.id;
      delete from public.kas_transaksi where id = v_existing_id;
    end if;

    return next v_ipk;
  end loop;
end;
$$;

create or replace function public.guard_ipk_managed_writes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Custom GUCs are caller-controlled, so do not use one as trusted proof.
  if (select auth.uid()) is not null
     and current_user is distinct from (
       select owner_role.rolname
       from pg_catalog.pg_proc target_function
       join pg_catalog.pg_roles owner_role on owner_role.oid = target_function.proowner
       where target_function.oid = pg_catalog.to_regprocedure('public.save_kas_ipk_month(date,jsonb)')
     ) then
    raise exception 'Rekap IPK dan transaksi tertaut hanya dapat diubah melalui proses sinkronisasi atomik.'
      using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.guard_ipk_managed_writes() from public, anon, authenticated;
drop trigger if exists guard_kas_ipk_managed_writes on public.kas_ipk;
create trigger guard_kas_ipk_managed_writes
  before insert or update or delete on public.kas_ipk
  for each row execute function public.guard_ipk_managed_writes();
drop trigger if exists guard_kas_transaksi_ipk_insert on public.kas_transaksi;
drop trigger if exists guard_kas_transaksi_ipk_update on public.kas_transaksi;
drop trigger if exists guard_kas_transaksi_ipk_delete on public.kas_transaksi;
create trigger guard_kas_transaksi_ipk_insert
  before insert on public.kas_transaksi
  for each row when (new.kas_ipk_id is not null)
  execute function public.guard_ipk_managed_writes();
create trigger guard_kas_transaksi_ipk_update
  before update on public.kas_transaksi
  for each row when (old.kas_ipk_id is not null or new.kas_ipk_id is not null)
  execute function public.guard_ipk_managed_writes();
create trigger guard_kas_transaksi_ipk_delete
  before delete on public.kas_transaksi
  for each row when (old.kas_ipk_id is not null)
  execute function public.guard_ipk_managed_writes();

revoke all on function public.save_kas_ipk_month(date, jsonb) from public, anon;
grant execute on function public.save_kas_ipk_month(date, jsonb) to authenticated;

-- Preserve each signature image but derive the displayed signer name from the
-- authenticated staff profile in the database trigger, never from browser input.
create or replace function public.guard_surat_update_by_role()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
  v_role text;
  v_name text;
begin
  select * into v_profile
  from public.profiles p
  where p.id = (select auth.uid());
  v_role := v_profile.role;

  -- Trusted service-role maintenance is intentionally outside end-user flows.
  if (select auth.uid()) is null then return new; end if;

  if v_role = 'RT' then
    v_name := coalesce(nullif(trim(v_profile.nama_lengkap), ''), nullif(trim(v_profile.nama), ''));
    if old.status is distinct from 'DRAFT' or new.status is distinct from 'MENUNGGU_RW' then
      raise exception 'RT hanya dapat meneruskan surat dari tahap draft.';
    end if;
    new.ttd_rt_nama := v_name;
    new.ttd_rt_at := now();
    if (to_jsonb(new) - array['status', 'ttd_rt', 'ttd_rt_at', 'ttd_rt_nama', 'ttd_rt_gambar'])
       is distinct from
       (to_jsonb(old) - array['status', 'ttd_rt', 'ttd_rt_at', 'ttd_rt_nama', 'ttd_rt_gambar'])
       or new.ttd_rt is not true
       or v_name is null
       or new.ttd_rt_nama is distinct from v_name
       or new.ttd_rt_at is null
       or nullif(new.ttd_rt_gambar, '') is null then
      raise exception 'RT hanya dapat meneruskan surat dengan identitas akun dan wilayah tugasnya.';
    end if;
    return new;
  elsif v_role in ('RW', 'ADMIN') then
    v_name := coalesce(nullif(trim(v_profile.nama_lengkap), ''), nullif(trim(v_profile.nama), ''));
    if new.status = 'TERBIT' then
      new.ttd_rw_nama := v_name;
      new.ttd_rw_at := now();
    end if;
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
         old.status is distinct from 'DISETUJUI'
         or new.ttd_rw is not true
         or v_name is null
         or nullif(new.ttd_rw_gambar, '') is null
       ))
       or (new.status = 'DITOLAK' and (
         old.status is distinct from 'MENUNGGU_RW'
         or nullif(trim(new.ditolak_alasan), '') is null
       )) then
      raise exception 'RW hanya dapat meninjau dan menandatangani surat dengan identitas akun yang sah.';
    end if;
    return new;
  end if;

  raise exception 'Role ini tidak berhak mengubah surat.';
end;
$$;

revoke all on function public.guard_surat_update_by_role() from public, anon, authenticated;
