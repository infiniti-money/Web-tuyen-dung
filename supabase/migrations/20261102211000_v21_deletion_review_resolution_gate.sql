-- v2.1: prevent accidental "resolved" deletion requests without prior manual review.
-- This migration adds a trigger only; it does not change or delete production records,
-- applications, CV metadata, or Storage objects.
create or replace function public.enforce_deletion_review_before_resolution()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if old.request_type='deletion'
     and new.status='resolved'
     and old.status is distinct from 'resolved' then
    if old.status <> 'in_review' then
      raise exception using errcode='23514',
        message='Review deletion request before marking it resolved';
    end if;
    if char_length(btrim(new.admin_response)) < 80 then
      raise exception using errcode='23514',
        message='Deletion resolution needs a substantive user-facing response (80+ characters)';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.enforce_deletion_review_before_resolution() from public,anon,authenticated;
create trigger enforce_data_rights_deletion_resolution
 before update on public.data_rights_requests
 for each row execute function public.enforce_deletion_review_before_resolution();

comment on function public.enforce_deletion_review_before_resolution() is
 'Manual review gate only: an in_review step and detailed response are necessary but do not prove physical deletion. CV/Storage deletion remains outside this function.';
