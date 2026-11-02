-- Privacy/data subject requests; intake and triage only, never auto-deletes.
-- No existing users, applications or Storage objects are modified.
create table public.data_rights_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_type text not null check (request_type in ('access','correction','deletion','restriction','withdrawal','other')),
  details text not null default '' check (length(details)<=1500),
  status text not null default 'pending' check (status in ('pending','in_review','resolved','rejected')),
  admin_response text not null default '' check (length(admin_response)<=1500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index data_rights_requests_user_created_idx on public.data_rights_requests(user_id,created_at desc);
create index data_rights_requests_admin_queue_idx on public.data_rights_requests(status,created_at desc);
create unique index data_rights_requests_one_active_type on public.data_rights_requests(user_id,request_type)
  where status in ('pending','in_review');
alter table public.data_rights_requests enable row level security;
create policy "data_rights_read_own_or_admin" on public.data_rights_requests
 for select to authenticated using (user_id=(select auth.uid()) or (select app_private.is_admin()));
create policy "data_rights_submit_own" on public.data_rights_requests
 for insert to authenticated with check (
 user_id=(select auth.uid()) and status='pending'
 and admin_response='' and reviewed_at is null
);
create policy "data_rights_admin_update" on public.data_rights_requests
 for update to authenticated using ((select app_private.is_admin()))
 with check ((select app_private.is_admin()));
revoke all on public.data_rights_requests from public,anon,authenticated;
grant select,insert,update on public.data_rights_requests to authenticated;

create or replace function public.protect_data_rights_requests()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if tg_op='INSERT' then
   if exists(select 1 from public.data_rights_requests r
             where r.user_id=new.user_id and r.created_at > now()-interval '15 minutes') then
     raise exception 'Please wait before submitting another request';
   end if;
   new.status:='pending';
   new.admin_response:='';
   new.reviewed_at:=null;
   new.created_at:=now();
   new.updated_at:=now();
 else
   if new.user_id is distinct from old.user_id
      or new.request_type is distinct from old.request_type
      or new.details is distinct from old.details
      or new.created_at is distinct from old.created_at then
     raise exception 'Identity, type and content of privacy requests cannot be changed';
   end if;
   if not app_private.is_admin() then
     raise exception 'Only admins may review data requests';
   end if;
   new.updated_at:=now();
   if new.status is distinct from old.status then
     if new.status in ('resolved','rejected') then new.reviewed_at:=now();
     elsif new.status in ('pending','in_review') then new.reviewed_at:=null;
     end if;
   end if;
 end if;
 return new;
end $$;
create trigger protect_data_rights_request_row
 before insert or update on public.data_rights_requests
 for each row execute function public.protect_data_rights_requests();

comment on table public.data_rights_requests is
 'Authenticated privacy rights intake; manual admin review only. No automatic deletion or export. Data retention policy pending approval.';
