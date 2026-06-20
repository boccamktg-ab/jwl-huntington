-- Add grants reviewer permission to JWL members (mirrors is_admin pattern)
alter table jwl_members add column if not exists is_grants_reviewer boolean not null default false;

-- Helper: is the current user an approved grants reviewer?
create or replace function is_grants_reviewer()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from jwl_members
    where auth_id = auth.uid() and status = 'approved' and is_grants_reviewer = true
  )
$$;

-- Helper: get the jwl_member id for the currently logged-in user
create or replace function current_member_id()
returns uuid language sql stable security definer as $$
  select id from jwl_members where auth_id = auth.uid()
$$;
