-- patch-025-community-sw.sql
-- Support non-school-affiliated social workers (charities, medical, government, etc.)

alter table social_workers
  add column if not exists sw_type text not null default 'school'
    check (sw_type in ('school', 'community')),
  add column if not exists organization text;

-- Existing rows stay as 'school' type (default)
