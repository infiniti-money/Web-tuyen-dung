-- Server-side abuse guardrails for authenticated users; additive, no data mutations.
-- Limits: candidate <=15 submitted applications per 30 minutes; employer <=50 jobs per 24 hours.
-- Advisory transaction locks serialize concurrent requests by user/company.
create or replace function public.enforce_candidate_apply_rate()
returns trigger language plpgsql set search_path=public,pg_temp as $$
declare recent integer;
begin
 if new.candidate_id is distinct from (select auth.uid()) or not app_private.is_candidate() then
    return new;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(new.candidate_id::text,18471));
 select count(*) into recent from public.applications
  where candidate_id=new.candidate_id and created_at>now()-interval '30 minutes';
 if recent>=15 then
   raise exception 'Application rate limit: try again later' using errcode='P0001';
 end if;
 return new;
end$$;
create trigger limit_candidate_application_frequency
before insert on public.applications
for each row execute function public.enforce_candidate_apply_rate();
revoke all on function public.enforce_candidate_apply_rate() from public,anon,authenticated;

create or replace function public.enforce_employer_job_rate()
returns trigger language plpgsql set search_path=public,pg_temp as $$
declare recent integer;
begin
 if not app_private.is_employer() then return new; end if;
 if not exists(select 1 from public.companies c where c.id=new.company_id and c.owner_id=(select auth.uid())) then return new;end if;
 perform pg_advisory_xact_lock(hashtextextended(new.company_id::text,18472));
 select count(*) into recent from public.jobs
  where company_id=new.company_id and created_at>now()-interval '24 hours';
 if recent>=50 then
   raise exception 'Job posting rate limit: contact administrator' using errcode='P0001';
 end if;
 return new;
end$$;
create trigger limit_employer_job_frequency
before insert on public.jobs
for each row execute function public.enforce_employer_job_rate();
revoke all on function public.enforce_employer_job_rate() from public,anon,authenticated;
create index applications_candidate_recent_idx on public.applications(candidate_id,created_at desc);
create index jobs_company_recent_idx on public.jobs(company_id,created_at desc);
