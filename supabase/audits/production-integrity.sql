-- Read-only audit; does not expose CV paths, names, emails or content.
-- Run with a privileged database operator account, not through GitHub Pages.
select
 (select count(*) from auth.users) as auth_users,
 (select count(*) from public.profiles) as profiles,
 (select count(*) from public.applications) as applications,
 (select count(*) from public.applications where cv_path is not null) as applications_with_cv,
 (select count(*) from public.applications a
   where a.cv_path is not null and not exists
     (select 1 from storage.objects o where o.bucket_id='candidate-cvs' and o.name=a.cv_path))
   as missing_application_cv_files,
 (select count(*) from public.candidate_documents d where not exists
     (select 1 from storage.objects o where o.bucket_id='candidate-cvs' and o.name=d.file_path))
   as missing_library_cv_files,
 (select count(*) from storage.objects o where o.bucket_id='candidate-cvs'
    and not exists(select 1 from public.applications a where a.cv_path=o.name)
    and not exists(select 1 from public.candidate_documents d where d.file_path=o.name))
   as unused_cv_files,
 (select count(*) from public.data_rights_requests where status in ('pending','in_review'))
   as open_privacy_requests,
 (select count(*) from public.job_notification_deliveries) as delivery_attempts;
