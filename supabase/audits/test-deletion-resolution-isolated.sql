-- Isolated validation of the v2.1 deletion-resolution migration.
-- All objects live in pg_temp; fake records only; transaction always ROLLBACK.
-- This is NOT a production migration and must not be applied with supabase db push.
BEGIN;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='20000ms';
CREATE TEMP TABLE data_rights_requests (
 id int primary key, request_type text not null, status text not null,
 admin_response text not null default ''
) ON COMMIT DROP;
-- Same trigger function and rule as the migration, but redirected to pg_temp:
-- v2.1: prevent accidental "resolved" deletion requests without prior manual review.
-- This migration adds a trigger only; it does not change or delete production records,
-- applications, CV metadata, or Storage objects.
create or replace function pg_temp.enforce_deletion_review_before_resolution()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if old.request_type='deletion'
     and new.status='resolved'
     then
    if old.status not in ('in_review','resolved') then
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
revoke all on function pg_temp.enforce_deletion_review_before_resolution() from public,anon,authenticated;
create trigger enforce_data_rights_deletion_resolution
 before update on pg_temp.data_rights_requests
 for each row execute function pg_temp.enforce_deletion_review_before_resolution();

comment on function pg_temp.enforce_deletion_review_before_resolution() is
 'Manual review gate only: an in_review step and detailed response are necessary but do not prove physical deletion. CV/Storage deletion remains outside this function.';

INSERT INTO pg_temp.data_rights_requests VALUES
 (1,'deletion','pending',''),
 (2,'deletion','in_review',''),
 (3,'deletion','in_review',''),
 (4,'access','pending',''),
 (5,'deletion','pending',''),
 (6,'deletion','pending',''),
 (7,'deletion','resolved',repeat('a',90)),
 (8,'deletion','resolved',repeat('a',90));
DO $test$
DECLARE passed int:=0;
BEGIN
 BEGIN
  UPDATE pg_temp.data_rights_requests SET status='resolved',admin_response=repeat('a',90) WHERE id=1;
  RAISE EXCEPTION 'FAIL pending to resolved';
 EXCEPTION WHEN check_violation THEN passed:=passed+1; END;
 BEGIN
  UPDATE pg_temp.data_rights_requests SET status='resolved',admin_response='short' WHERE id=2;
  RAISE EXCEPTION 'FAIL short response accepted';
 EXCEPTION WHEN check_violation THEN passed:=passed+1; END;
 UPDATE pg_temp.data_rights_requests SET status='resolved',admin_response=repeat('reviewed and approved. ',5) WHERE id=3;
 passed:=passed+1;
 UPDATE pg_temp.data_rights_requests SET status='resolved',admin_response='ok' WHERE id=4;
 passed:=passed+1;
 UPDATE pg_temp.data_rights_requests SET status='in_review' WHERE id=5;
 passed:=passed+1;
 UPDATE pg_temp.data_rights_requests SET status='rejected' WHERE id=6;
 passed:=passed+1;
 BEGIN
  UPDATE pg_temp.data_rights_requests SET admin_response='short' WHERE id=7;
  RAISE EXCEPTION 'FAIL cleared finalized response';
 EXCEPTION WHEN check_violation THEN passed:=passed+1; END;
 UPDATE pg_temp.data_rights_requests SET admin_response=repeat('revised valid response. ',5) WHERE id=8;
 passed:=passed+1;
 IF passed<>8 THEN RAISE EXCEPTION 'FAIL expected 8 cases but got %',passed; END IF;
 RAISE NOTICE 'PASS 8 isolated cases (temp table only)';
END $test$;
ROLLBACK;
