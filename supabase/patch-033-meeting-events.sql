-- patch-033: meeting type (meeting vs event), description field, and shifts

-- Add meeting_type, description, end_time to jwl_meetings
alter table jwl_meetings
  add column if not exists meeting_type text default 'meeting' check (meeting_type in ('meeting', 'event')),
  add column if not exists description text,
  add column if not exists end_time text;

-- Shifts for events (e.g. "Assembly 8-11am", "Transport 11am-12pm")
create table if not exists jwl_meeting_shifts (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references jwl_meetings(id) on delete cascade,
  label text not null,
  start_time text not null,
  end_time text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Shift signups (one row per member per shift)
create table if not exists jwl_meeting_shift_signups (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references jwl_meeting_shifts(id) on delete cascade,
  member_id uuid not null references jwl_members(id) on delete cascade,
  notes text,
  created_at timestamptz default now(),
  unique(shift_id, member_id)
);

alter table jwl_meeting_shifts enable row level security;
alter table jwl_meeting_shift_signups enable row level security;

-- Approved members can read shifts and signups; service role handles writes
create policy "shifts_read_all" on jwl_meeting_shifts for select using (true);
create policy "shifts_service_write" on jwl_meeting_shifts for all using (true);

create policy "signups_read_all" on jwl_meeting_shift_signups for select using (true);
create policy "signups_service_write" on jwl_meeting_shift_signups for all using (true);
