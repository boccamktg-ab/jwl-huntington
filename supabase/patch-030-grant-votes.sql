-- patch-030: grant member vote feature

alter table grant_applications
  add column if not exists vote_summary text,
  add column if not exists vote_status text
    check (vote_status in ('open', 'paused', 'closed'));

create table if not exists grant_member_votes (
  id            uuid primary key default gen_random_uuid(),
  application_id uuid not null references grant_applications(id) on delete cascade,
  member_id     uuid not null references jwl_members(id) on delete cascade,
  token         text not null unique default gen_random_uuid()::text,
  vote          text check (vote in ('yes', 'no', 'more_info')),
  notes         text,
  voted_at      timestamptz,
  created_at    timestamptz not null default now(),
  unique (application_id, member_id)
);

alter table grant_member_votes enable row level security;

-- Only the service role (used server-side) can read/write votes.
-- Grants reviewers can read tallies via the service role key in API routes.
-- No direct client-side access is needed for this table.
create policy "gmv_service_only" on grant_member_votes
  using (false)
  with check (false);
