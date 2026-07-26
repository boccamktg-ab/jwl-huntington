-- patch-026-member-membership.sql
-- JWL member membership tracking: positions, dues, directory fields

-- ─── Configurable position list ──────────────────────────────────────────────
create table if not exists member_positions (
  id           uuid primary key default gen_random_uuid(),
  label        text not null,
  allows_detail boolean not null default false,  -- true = show free-text sub-field
  sort_order   integer not null default 99,
  is_active    boolean not null default true,
  created_at   timestamptz default now()
);

alter table member_positions enable row level security;
-- Service role only — no anon/authenticated policies needed.

-- Seed default positions
insert into member_positions (label, allows_detail, sort_order) values
  ('President',                   false, 1),
  ('Treasurer',                   false, 2),
  ('Secretary / VP of Membership',false, 3),
  ('VP of Programs',              false, 4),
  ('VP of Grants',                false, 5),
  ('VP of Youth Activation',      false, 6),
  ('VP of Public Relations',      false, 7),
  ('Committee Chair',             true,  8),
  ('General Member',              false, 9);

-- ─── jwl_members additions ───────────────────────────────────────────────────
alter table jwl_members
  add column if not exists phone                text,
  add column if not exists join_year            integer,
  add column if not exists dues_paid_through_year integer,
  add column if not exists position_id          uuid references member_positions(id) on delete set null,
  add column if not exists position_detail      text;  -- free text when position allows_detail = true
