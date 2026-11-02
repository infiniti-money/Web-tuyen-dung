-- Allow authenticated owners to edit only non-privileged contact columns;
-- existing SELECT and RLS policies restrict rows to owner (or Admin for reading).
grant update(full_name,phone,birth_date) on public.profiles to authenticated;
