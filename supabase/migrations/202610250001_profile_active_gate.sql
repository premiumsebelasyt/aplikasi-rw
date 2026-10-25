-- Add an explicit profile activation gate for legacy Production schemas.
-- Only the nine known staff aliases are activated, and only when the stored
-- role/scope matches the alias. Other profiles remain inactive until reviewed.
do $$
declare
  added_aktif boolean := false;
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'aktif'
  ) then
    alter table public.profiles
      add column aktif boolean not null default false;
    added_aktif := true;
  end if;

  if added_aktif then
    update public.profiles as p
    set aktif = true
    from auth.users as u,
      (values
        ('ketua-rt01@rw16.invalid', 'RT', '01'),
        ('ketua-rt01@rw16.mail', 'RT', '01'),
        ('ketua-rt02@rw16.invalid', 'RT', '02'),
        ('ketua-rt02@rw16.mail', 'RT', '02'),
        ('ketua-rt03@rw16.invalid', 'RT', '03'),
        ('ketua-rt03@rw16.mail', 'RT', '03'),
        ('ketua-rt04@rw16.invalid', 'RT', '04'),
        ('ketua-rt04@rw16.mail', 'RT', '04'),
        ('ketua-rt05@rw16.invalid', 'RT', '05'),
        ('ketua-rt05@rw16.mail', 'RT', '05'),
        ('ketua-rt06@rw16.invalid', 'RT', '06'),
        ('ketua-rt06@rw16.mail', 'RT', '06'),
        ('bendahara-rw16@rw16.invalid', 'BENDAHARA', null),
        ('bendahara-rw16@rw16.mail', 'BENDAHARA', null),
        ('ketua-rw16@rw16.invalid', 'RW', null),
        ('ketua-rw16@rw16.mail', 'RW', null),
        ('admin-rw16@rw16.invalid', 'ADMIN', null),
        ('admin-rw16@rw16.mail', 'ADMIN', null)
      ) as expected(email, role, rt)
    where u.id = p.id
      and lower(u.email) = expected.email
      and p.role = expected.role
      and p.rt is not distinct from expected.rt
      and u.email_confirmed_at is not null
      and (u.banned_until is null or u.banned_until <= now());
  end if;
end
$$;

comment on column public.profiles.aktif is
  'Profile access gate. Only confirmed, unbanned known staff aliases with matching role/scope are activated by the legacy migration; other profiles and new profiles remain inactive until explicitly provisioned.';
