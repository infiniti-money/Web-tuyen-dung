-- Dispatch is fail-closed: every outbound channel requires separate, explicit opt-in.
alter table public.job_alert_preferences
  add column email_opt_in boolean not null default false,
  add column push_opt_in boolean not null default false,
  add column email_opted_in_at timestamptz,
  add column push_opted_in_at timestamptz;

create or replace function public.stamp_job_alert_opt_in()
returns trigger
language plpgsql set search_path=public,pg_temp as $$
begin
  if new.email_opt_in and (tg_op='INSERT' or not old.email_opt_in) then
    new.email_opted_in_at:=now();
  elsif not new.email_opt_in then
    new.email_opted_in_at:=null;
  elsif tg_op='UPDATE' then
    new.email_opted_in_at:=old.email_opted_in_at;
  end if;
  if new.push_opt_in and (tg_op='INSERT' or not old.push_opt_in) then
    new.push_opted_in_at:=now();
  elsif not new.push_opt_in then
    new.push_opted_in_at:=null;
  elsif tg_op='UPDATE' then
    new.push_opted_in_at:=old.push_opted_in_at;
  end if;
  return new;
end $$;
create trigger stamp_job_alert_opt_in
before insert or update on public.job_alert_preferences
for each row execute function public.stamp_job_alert_opt_in();

alter table public.jobs add column published_at timestamptz;
create or replace function public.stamp_published_job()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if new.status='published' and (tg_op='INSERT' or old.status is distinct from 'published') then
    new.published_at:=now();
  elsif tg_op='UPDATE' and new.status is not distinct from old.status then
    new.published_at:=old.published_at;
  elsif tg_op='UPDATE' and new.status<>'published' then
    new.published_at:=old.published_at;
  end if;
  return new;
end $$;
create trigger stamp_published_job
before insert or update on public.jobs
for each row execute function public.stamp_published_job();
create index jobs_new_publications_idx on public.jobs(published_at desc)
where status='published' and published_at is not null;

create table public.web_push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 endpoint text not null unique check(length(endpoint) between 25 and 2000 and endpoint like 'https://%'),
 p256dh text not null check(length(p256dh) between 20 and 256),
 auth_key text not null check(length(auth_key) between 8 and 256),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index web_push_subscriptions_user_idx on public.web_push_subscriptions(user_id);
alter table public.web_push_subscriptions enable row level security;
create policy "push_subscriptions_read_own" on public.web_push_subscriptions for select to authenticated
  using (user_id=(select auth.uid()) and app_private.is_candidate());
create policy "push_subscriptions_add_own" on public.web_push_subscriptions for insert to authenticated
  with check (user_id=(select auth.uid()) and app_private.is_candidate());
create policy "push_subscriptions_modify_own" on public.web_push_subscriptions for update to authenticated
  using (user_id=(select auth.uid()) and app_private.is_candidate())
  with check (user_id=(select auth.uid()) and app_private.is_candidate());
create policy "push_subscriptions_remove_own" on public.web_push_subscriptions for delete to authenticated
  using (user_id=(select auth.uid()) and app_private.is_candidate());
revoke all on public.web_push_subscriptions from public,anon,authenticated;
grant select,insert,update,delete on public.web_push_subscriptions to authenticated;

create table public.job_notification_deliveries (
 id bigint generated always as identity primary key,
 user_id uuid not null references public.profiles(id) on delete cascade,
 job_id uuid not null references public.jobs(id) on delete cascade,
 channel text not null check(channel in ('email','push')),
 status text not null default 'processing' check(status in ('processing','sent','failed')),
 sent_at timestamptz,
 error_code text,
 created_at timestamptz not null default now(),
 unique(user_id,job_id,channel)
);
create index job_notification_deliveries_user_date_idx
on public.job_notification_deliveries(user_id,created_at desc);
alter table public.job_notification_deliveries enable row level security;
revoke all on public.job_notification_deliveries from public,anon,authenticated;
-- No client RLS policies: service-side dispatcher owns read/write.

comment on table public.job_notification_deliveries is
  'Deduplicated delivery log: a user receives at most one send attempt per channel and published job. No client access.';
comment on column public.jobs.published_at is
  'Assigned only when a job becomes published. Pre-existing published jobs stay NULL to prevent historic opt-in spam.';
