-- patch-024-hc-emails.sql
-- Audit log for family record changes (§2.6) and broadcast send log (§3)

create table if not exists family_change_log (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid references families(id) on delete cascade,
  changed_by_name text not null,
  changed_by_role text not null,   -- 'social_worker' | 'admin'
  change_summary  text not null,   -- human-readable, e.g. "Child age updated from 8 to 9"
  created_at     timestamptz default now()
);

create index if not exists idx_family_change_log_family on family_change_log(family_id);

alter table family_change_log enable row level security;
-- Only service role (backend) accesses this table — no anon/authenticated policies needed.

create table if not exists broadcast_send_log (
  id             uuid primary key default gen_random_uuid(),
  sent_by        text not null,    -- admin email
  message_type   text not null,   -- 'season_open' | 'deadline_reminder' | 'custom'
  subject        text not null,
  body_preview   text,            -- first 300 chars of body
  recipient_count int not null,
  sent_at        timestamptz default now()
);

alter table broadcast_send_log enable row level security;
-- Only service role (backend) accesses this table — no anon/authenticated policies needed.

-- 'rejected' status for families
alter table families
  drop constraint if exists families_status_check;

alter table families
  add constraint families_status_check
  check (status in ('draft', 'submitted', 'approved', 'rejected'));
