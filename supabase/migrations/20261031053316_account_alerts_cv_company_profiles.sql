-- Account-synced bookmarks, on-site job alerts, personal CV library and company profile fields.
-- No existing rows are modified; all new user tables are private under RLS.
create table public.saved_jobs (
 user_id uuid not null references public.profiles(id) on delete cascade,
 job_id uuid not null references public.jobs(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key (user_id,job_id)
);
create index saved_jobs_user_date_idx on public.saved_jobs(user_id,created_at desc);
alter table public.saved_jobs enable row level security;
create policy "saved_jobs_select_own" on public.saved_jobs for select to authenticated using ((select auth.uid())=user_id);
create policy "saved_jobs_insert_own" on public.saved_jobs for insert to authenticated with check ((select auth.uid())=user_id);
create policy "saved_jobs_delete_own" on public.saved_jobs for delete to authenticated using ((select auth.uid())=user_id);
revoke all on public.saved_jobs from public,anon,authenticated;
grant select,insert,delete on public.saved_jobs to authenticated;

create table public.job_alert_preferences(
 user_id uuid primary key references public.profiles(id) on delete cascade,
 enabled boolean not null default true,
 keyword text not null default '' check(length(keyword)<=120),
 location text not null default '' check(length(location)<=120),
 industry text not null default '' check(length(industry)<=120),
 min_salary integer check(min_salary between 0 and 100000),
 last_seen_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.job_alert_preferences enable row level security;
create policy "alerts_select_own" on public.job_alert_preferences for select to authenticated using ((select auth.uid())=user_id);
create policy "alerts_insert_own" on public.job_alert_preferences for insert to authenticated with check ((select auth.uid())=user_id);
create policy "alerts_update_own" on public.job_alert_preferences for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
revoke all on public.job_alert_preferences from public,anon,authenticated;
grant select,insert,update on public.job_alert_preferences to authenticated;

create table public.candidate_documents(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 file_path text not null unique check(length(file_path)<=500),
 original_name text not null check(length(original_name) between 1 and 180),
 file_size integer not null check(file_size between 1 and 5242880),
 created_at timestamptz not null default now()
);
create index candidate_documents_owner_created_idx on public.candidate_documents(user_id,created_at desc);
alter table public.candidate_documents enable row level security;
create policy "candidate_documents_select_own" on public.candidate_documents for select to authenticated
 using ((select auth.uid())=user_id and app_private.is_candidate());
create policy "candidate_documents_insert_own" on public.candidate_documents for insert to authenticated
 with check ((select auth.uid())=user_id and app_private.is_candidate()
  and (storage.foldername(file_path))[1]=(select auth.uid())::text and file_path like '%.pdf');
create policy "candidate_documents_delete_unused" on public.candidate_documents for delete to authenticated
 using ((select auth.uid())=user_id and app_private.is_candidate()
 and not exists(select 1 from public.applications a where a.cv_path=candidate_documents.file_path));
revoke all on public.candidate_documents from public,anon,authenticated;
grant select,insert,delete on public.candidate_documents to authenticated;

alter table public.companies
 add column website text not null default '',
 add column industry text not null default '',
 add column company_size text not null default '',
 add column founded_year integer,
 add column benefits text not null default '';
alter table public.companies
 add constraint company_profile_website_format check(
  website='' or (length(website)<=240 and website ~* '^https://[a-z0-9]([a-z0-9.-]*[a-z0-9])?(/[^[:space:]]*)?$')
 ),
 add constraint company_profile_industry_length check(length(industry)<=120),
 add constraint company_profile_size_length check(length(company_size)<=60),
 add constraint company_profile_benefits_length check(length(benefits)<=2500),
 add constraint company_profile_founded_year check(founded_year is null or founded_year between 1800 and 2100);
