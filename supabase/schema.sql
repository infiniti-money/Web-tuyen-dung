-- Hưng Yên Jobs v2 — run in Supabase SQL editor
create extension if not exists pgcrypto;
create schema if not exists app_private;
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '',
 phone text,
 role text not null default 'candidate' check(role in ('candidate','employer','admin')),
 created_at timestamptz not null default now()
);
create table if not exists public.companies (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.profiles(id) on delete cascade,
 name text not null check(length(trim(name))>=2),
 description text not null default '',
 location text not null default 'Hưng Yên',
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now()
);
create table if not exists public.jobs (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 title text not null check(length(trim(title))>=5),
 description text not null,
 requirements text not null default '',
 location text not null,
 industry text not null,
 salary_min integer check (salary_min>=0),
 salary_max integer check (salary_max>=0),
 status text not null default 'pending' check(status in ('draft','pending','published','rejected','closed')),
 created_at timestamptz not null default now(),
 constraint valid_salary check(salary_max is null or salary_min is null or salary_max>=salary_min)
);
create table if not exists public.applications (
 id uuid primary key default gen_random_uuid(),
 job_id uuid not null references public.jobs(id) on delete cascade,
 candidate_id uuid not null references public.profiles(id) on delete cascade,
 cover_letter text not null default '',
 cv_path text,
 status text not null default 'submitted' check(status in ('submitted','reviewing','shortlisted','rejected','hired')),
 created_at timestamptz not null default now(),
 unique(job_id,candidate_id)
);
create index if not exists jobs_location_status_idx on public.jobs(status,location);
create index if not exists jobs_company_idx on public.jobs(company_id);
create index if not exists applications_job_idx on public.applications(job_id);
create index if not exists applications_candidate_idx on public.applications(candidate_id);
create unique index if not exists one_company_per_owner on public.companies(owner_id);
create or replace function public.create_profile() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,full_name,role) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),
 case when new.raw_user_meta_data->>'requested_role'='employer' then 'employer' else 'candidate' end);
 return new;
end;$$;
drop trigger if exists auth_user_created on auth.users;
create trigger auth_user_created after insert on auth.users for each row execute function public.create_profile();
-- Prevent users from elevating privileges by altering their profile.
create or replace function public.guard_profile_role() returns trigger language plpgsql as $$
begin
 if new.role is distinct from old.role then raise exception 'Role cannot be changed'; end if;
 return new;
end;$$;
drop trigger if exists protect_role on public.profiles;
create trigger protect_role before update on public.profiles for each row execute function public.guard_profile_role();
-- Keep status transitions server-controlled; only admin can approve or publish.
create or replace function app_private.is_admin() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role='admin');$$;
create or replace function app_private.is_employer() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role='employer');$$;
create or replace function app_private.is_candidate() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role='candidate');$$;
create or replace function public.guard_company_status() returns trigger language plpgsql as $$
begin
 if not app_private.is_admin() then
   if tg_op='INSERT' then new.status:='pending';
   elsif new.status is distinct from old.status then raise exception 'Only administrators can review companies'; end if;
 end if;
 return new;
end;$$;
drop trigger if exists protect_company_status on public.companies;
create trigger protect_company_status before insert or update on public.companies for each row execute function public.guard_company_status();
create or replace function public.guard_job_status() returns trigger language plpgsql as $$
begin
 if not app_private.is_admin() then
   if tg_op='INSERT' then
     if new.status not in ('draft','pending') then new.status:='pending'; end if;
   elsif new.status is distinct from old.status then
     if old.status='draft' and new.status='pending' then null;
     elsif old.status='published' and new.status='closed' then null;
     else raise exception 'Job publication requires moderation'; end if;
   end if;
 end if;
 return new;
end;$$;
drop trigger if exists protect_job_status on public.jobs;
create trigger protect_job_status before insert or update on public.jobs for each row execute function public.guard_job_status();
create or replace function public.guard_application_status() returns trigger language plpgsql as $$
begin
 if tg_op='INSERT' then
   new.status:='submitted';
   if new.cv_path is not null and split_part(new.cv_path,'/',1) <> new.candidate_id::text then
     raise exception 'CV must belong to the applying candidate';
   end if;
 elsif new.status is distinct from old.status and not exists (
  select 1 from public.jobs j join public.companies c on c.id=j.company_id
  where j.id=new.job_id and c.owner_id=auth.uid()
 ) and not app_private.is_admin() then raise exception 'Application status belongs to employer'; end if;
 return new;
end;$$;
drop trigger if exists protect_application_status on public.applications;
create trigger protect_application_status before insert or update on public.applications for each row execute function public.guard_application_status();
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
create policy "own or admin profile read" on public.profiles for select using(id=auth.uid() or app_private.is_admin());
create policy "own profile edit" on public.profiles for update using(id=auth.uid()) with check(id=auth.uid());
create policy "companies public approved or owner or admin" on public.companies for select using(status='approved' or owner_id=auth.uid() or app_private.is_admin());
create policy "employer creates own company" on public.companies for insert to authenticated with check(owner_id=auth.uid() and app_private.is_employer());
create policy "employer updates company or admin" on public.companies for update to authenticated using(owner_id=auth.uid() or app_private.is_admin()) with check(owner_id=auth.uid() or app_private.is_admin());
create policy "jobs public published or owner or admin" on public.jobs for select using(status='published' or app_private.is_admin() or exists(select 1 from public.companies c where c.id=company_id and c.owner_id=auth.uid()));
create policy "approved employer creates jobs" on public.jobs for insert to authenticated with check(app_private.is_employer() and exists(select 1 from public.companies c where c.id=company_id and c.owner_id=auth.uid() and c.status='approved'));
create policy "employer updates own jobs or admin" on public.jobs for update to authenticated using(app_private.is_admin() or exists(select 1 from public.companies c where c.id=company_id and c.owner_id=auth.uid())) with check(app_private.is_admin() or exists(select 1 from public.companies c where c.id=company_id and c.owner_id=auth.uid()));
create policy "candidate creates own application" on public.applications for insert to authenticated with check(candidate_id=auth.uid() and app_private.is_candidate() and exists(select 1 from public.jobs j where j.id=job_id and j.status='published'));
create policy "candidate employer admin view applications" on public.applications for select to authenticated using(candidate_id=auth.uid() or app_private.is_admin() or exists(select 1 from public.jobs j join public.companies c on c.id=j.company_id where j.id=job_id and c.owner_id=auth.uid()));
create policy "employer updates applications" on public.applications for update to authenticated using(app_private.is_admin() or exists(select 1 from public.jobs j join public.companies c on c.id=j.company_id where j.id=job_id and c.owner_id=auth.uid())) with check(app_private.is_admin() or exists(select 1 from public.jobs j join public.companies c on c.id=j.company_id where j.id=job_id and c.owner_id=auth.uid()));
-- Private CV bucket; access allowed to candidate, employer for related application, admin.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('candidate-cvs','candidate-cvs',false,5242880,array['application/pdf'])
on conflict (id) do nothing;
create policy "candidate uploads own pdf" on storage.objects for insert to authenticated
with check(bucket_id='candidate-cvs' and app_private.is_candidate() and (storage.foldername(name))[1]=auth.uid()::text);
create policy "candidate or permitted reviewer reads cv" on storage.objects for select to authenticated
using(bucket_id='candidate-cvs' and (
 (storage.foldername(name))[1]=auth.uid()::text or app_private.is_admin() or exists(
 select 1 from public.applications a join public.jobs j on j.id=a.job_id
 join public.companies c on c.id=j.company_id
 where a.cv_path=storage.objects.name and c.owner_id=auth.uid()
 )
));
-- First admin is provisioned MANUALLY by a trusted operator in SQL editor,
-- never through public registration:
-- drop trigger protect_role on public.profiles;
-- update public.profiles set role='admin' where id='<verified-user-uuid>';
-- create trigger protect_role before update on public.profiles for each row execute function public.guard_profile_role();

-- Additional integrity guards: immutable owners, immutable application linkage,
-- reviewed records cannot be silently rewritten after approval.
create or replace function public.guard_company_ownership() returns trigger language plpgsql as $$
begin
 if new.owner_id is distinct from old.owner_id then raise exception 'Company owner is immutable'; end if;
 if old.status='approved' and not app_private.is_admin() and
  (new.name is distinct from old.name or new.description is distinct from old.description or new.location is distinct from old.location)
 then raise exception 'Approved company details require administrator review'; end if;
 return new;
end;$$;
drop trigger if exists protect_company_ownership on public.companies;
create trigger protect_company_ownership before update on public.companies
for each row execute function public.guard_company_ownership();
create or replace function public.guard_job_content() returns trigger language plpgsql as $$
begin
 if new.company_id is distinct from old.company_id then raise exception 'Company cannot change'; end if;
 if not app_private.is_admin() and old.status in ('published','closed','rejected') and
 (new.title,new.description,new.requirements,new.location,new.industry,new.salary_min,new.salary_max)
 is distinct from
 (old.title,old.description,old.requirements,old.location,old.industry,old.salary_min,old.salary_max)
 then raise exception 'Reviewed job cannot be edited without new moderation'; end if;
 return new;
end;$$;
drop trigger if exists protect_job_content on public.jobs;
create trigger protect_job_content before update on public.jobs for each row execute function public.guard_job_content();
create or replace function public.guard_application_fields() returns trigger language plpgsql as $$
begin
 if new.job_id is distinct from old.job_id or new.candidate_id is distinct from old.candidate_id
 or new.cover_letter is distinct from old.cover_letter or new.cv_path is distinct from old.cv_path
 then raise exception 'Application contents are immutable'; end if;
 return new;
end;$$;
drop trigger if exists protect_application_fields on public.applications;
create trigger protect_application_fields before update on public.applications for each row execute function public.guard_application_fields();
-- Explicitly limit employer updates to existing companies; even after permission
-- errors, no public SELECT of pending company records belonging to other owners.

-- Employer-safe application listing: reveal only applicant name and application
-- data for jobs belonging to the authenticated employer. Avoid exposing phone.
create or replace function public.employer_applications()
returns table(
 id uuid, job_id uuid, full_name text, cover_letter text,
 cv_path text, status text, created_at timestamptz
)
language sql stable security definer set search_path=public as $$
 select a.id,a.job_id,p.full_name,a.cover_letter,a.cv_path,a.status,a.created_at
 from public.applications a
 join public.jobs j on j.id=a.job_id
 join public.companies c on c.id=j.company_id
 join public.profiles p on p.id=a.candidate_id
 where c.owner_id=auth.uid() and app_private.is_employer()
 order by a.created_at desc;
$$;
revoke all on function public.employer_applications() from public, anon;
grant execute on function public.employer_applications() to authenticated;

-- Upload failures must be cleanable without leaving orphaned private CVs.
create policy "candidate deletes orphan cv" on storage.objects for delete
to authenticated using(
 bucket_id='candidate-cvs'
 and (storage.foldername(name))[1]=auth.uid()::text
 and not exists(select 1 from public.applications a where a.cv_path=name)
);
-- Never publish a job associated with a company that is not approved.
create or replace function public.check_job_publication() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if new.status='published' and not exists (
  select 1 from public.companies c where c.id=new.company_id and c.status='approved'
 ) then raise exception 'Cannot publish jobs from an unapproved company'; end if;
 return new;
end;$$;
drop trigger if exists require_approved_company on public.jobs;
create trigger require_approved_company before insert or update on public.jobs
for each row execute function public.check_job_publication();

-- Explicit Data API privileges for new Supabase projects where automatic grants are disabled.
revoke all on public.profiles, public.companies, public.jobs, public.applications from anon, authenticated;
grant select on public.jobs, public.companies to anon;
grant select on public.profiles, public.jobs, public.companies, public.applications to authenticated;
grant update(full_name,phone) on public.profiles to authenticated;
grant insert(owner_id,name,description,location), update(name,description,location,status) on public.companies to authenticated;
grant insert(company_id,title,description,requirements,location,industry,salary_min,salary_max,status),
 update(title,description,requirements,location,industry,salary_min,salary_max,status) on public.jobs to authenticated;
grant insert(job_id,candidate_id,cover_letter,cv_path,status), update(status) on public.applications to authenticated;
-- Recruiter accesses candidate name only via the scoped employer_applications() RPC; applicant profiles remain private.
-- CV cleanup permission is already defined in the candidate deletes orphan cv policy above.
grant usage on schema app_private to anon, authenticated;
revoke all on function app_private.is_admin() from public, anon, authenticated;
revoke all on function app_private.is_employer() from public, anon, authenticated;
revoke all on function app_private.is_candidate() from public, anon, authenticated;
grant execute on function app_private.is_admin() to anon, authenticated;
grant execute on function app_private.is_employer(), app_private.is_candidate() to authenticated;
revoke all on function public.create_profile() from public, anon, authenticated;
revoke all on function public.guard_profile_role() from public, anon, authenticated;
revoke all on function public.guard_company_status() from public, anon, authenticated;
revoke all on function public.guard_job_status() from public, anon, authenticated;
revoke all on function public.guard_application_status() from public, anon, authenticated;
revoke all on function public.guard_company_ownership() from public, anon, authenticated;
revoke all on function public.guard_job_content() from public, anon, authenticated;
revoke all on function public.guard_application_fields() from public, anon, authenticated;

-- Uploaded CV must belong to the applicant's own storage directory.
create or replace function public.guard_application_cv() returns trigger language plpgsql as $$
begin
 if new.cv_path is not null and (
   split_part(new.cv_path,'/',1) <> new.candidate_id::text
   or lower(right(new.cv_path,4)) <> '.pdf'
 ) then raise exception 'CV path must be an applicant-owned PDF'; end if;
 return new;
end;$$;
drop trigger if exists protect_application_cv on public.applications;
create trigger protect_application_cv before insert or update on public.applications
for each row execute function public.guard_application_cv();
revoke all on function public.guard_application_cv() from public, anon, authenticated;

-- Security hardening verified in production Supabase database 2026-10-30.
alter function public.guard_profile_role() set search_path=public,pg_temp;
alter function public.guard_company_status() set search_path=public,pg_temp;
alter function public.guard_job_status() set search_path=public,pg_temp;
alter function public.guard_application_status() set search_path=public,pg_temp;
alter function public.guard_company_ownership() set search_path=public,pg_temp;
alter function public.guard_job_content() set search_path=public,pg_temp;
alter function public.guard_application_fields() set search_path=public,pg_temp;
alter function public.guard_application_cv() set search_path=public,pg_temp;
revoke execute on function public.check_job_publication() from public, anon, authenticated;
-- Keep the privileged lookup hidden from the PostgREST exposed schema.
create or replace function app_private.employer_applications()
returns table(id uuid, job_id uuid, full_name text, cover_letter text,
              cv_path text, status text, created_at timestamptz)
language sql stable security definer set search_path=public,pg_temp as $$
 select a.id,a.job_id,p.full_name,a.cover_letter,a.cv_path,a.status,a.created_at
 from public.applications a
 join public.jobs j on j.id=a.job_id
 join public.companies c on c.id=j.company_id
 join public.profiles p on p.id=a.candidate_id
 where c.owner_id=auth.uid() and app_private.is_employer()
 order by a.created_at desc
$$;
revoke all on function app_private.employer_applications() from public,anon;
grant execute on function app_private.employer_applications() to authenticated;
create or replace function public.employer_applications()
returns table(id uuid, job_id uuid, full_name text, cover_letter text,
              cv_path text, status text, created_at timestamptz)
language sql stable security invoker set search_path=public,pg_temp as $$
 select * from app_private.employer_applications()
$$;
revoke all on function public.employer_applications() from public,anon;
grant execute on function public.employer_applications() to authenticated;
