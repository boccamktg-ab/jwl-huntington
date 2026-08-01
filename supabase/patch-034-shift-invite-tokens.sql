-- patch-034: per-member per-shift invite tokens for one-click email signup

create table if not exists jwl_shift_invite_tokens (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references jwl_meeting_shifts(id) on delete cascade,
  member_id uuid not null references jwl_members(id) on delete cascade,
  token uuid not null default gen_random_uuid(),
  created_at timestamptz default now(),
  unique(shift_id, member_id),
  unique(token)
);

alter table jwl_shift_invite_tokens enable row level security;
create policy "shift_tokens_service_only" on jwl_shift_invite_tokens for all using (true);
