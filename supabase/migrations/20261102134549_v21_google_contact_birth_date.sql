-- Add voluntary contact details without changing existing accounts or roles.
alter table public.profiles add column if not exists birth_date date;
alter table public.profiles add constraint profiles_birth_date_reasonable
 check (birth_date is null or (birth_date >= date '1900-01-01' and birth_date <= current_date));
alter table public.profiles add constraint profiles_phone_format
 check (phone is null or phone ~ '^\+?[0-9]{9,15}$');
comment on column public.profiles.birth_date is 'Optional date of birth. Private profile data, not shown in public company/job pages.';
comment on column public.profiles.phone is 'Optional contact phone; visible to profile owner and privileged administrators only via RLS.';
create or replace function public.create_profile()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare
  submitted_phone text:=nullif(btrim(coalesce(new.raw_user_meta_data->>'phone','')),'');
  submitted_dob text:=nullif(btrim(coalesce(new.raw_user_meta_data->>'birth_date','')),'');
  normalized_dob date:=null;
begin
  -- User metadata is untrusted: never use it to confer admin privileges.
  if submitted_phone is not null and submitted_phone !~ '^\+?[0-9]{9,15}$' then
    submitted_phone:=null;
  end if;
  if submitted_dob is not null and submitted_dob ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    begin
      normalized_dob:=submitted_dob::date;
      if normalized_dob<date '1900-01-01' or normalized_dob>current_date then normalized_dob:=null;end if;
    exception when invalid_datetime_format or datetime_field_overflow then normalized_dob:=null;
    end;
  end if;
  insert into public.profiles(id,full_name,phone,birth_date,role)
   values(new.id,
     left(coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'),''),new.raw_user_meta_data->>'name',''),100),
     submitted_phone,normalized_dob,
     case when new.raw_user_meta_data->>'requested_role'='employer' then 'employer' else 'candidate' end);
  return new;
end;$$;
revoke all on function public.create_profile() from public,anon,authenticated;
