-- Applied to Supabase hung-yen-jobs on 2026-10-31 as migration
-- 20261031030916_fix_employer_cv_storage_access.
-- Correct unqualified "name" in the employer CV reviewer policy.
-- Inside a subquery joined to public.companies, the unqualified name
-- previously resolved to companies.name instead of storage.objects.name.
--
-- Access remains limited to:
--   1. the candidate's own files (folder name = auth.uid()),
--   2. administrators, and
--   3. an employer only when a job application references this exact CV
--      and the application belongs to one of their jobs.
alter policy "candidate or permitted reviewer reads cv" on storage.objects
to authenticated
using (
  bucket_id = 'candidate-cvs'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or app_private.is_admin()
    or exists (
      select 1
      from public.applications a
      join public.jobs j on j.id = a.job_id
      join public.companies c on c.id = j.company_id
      where a.cv_path = storage.objects.name
        and c.owner_id = auth.uid()
    )
  )
);
