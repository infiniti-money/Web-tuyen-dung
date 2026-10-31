-- Allow owner-only changes to new public profile columns while existing RLS and anti-hijack triggers remain active.
grant update (website,industry,company_size,founded_year,benefits)
on public.companies to authenticated;
