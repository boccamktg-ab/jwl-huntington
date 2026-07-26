-- JWL Member Meetings

create table jwl_meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  meeting_date date not null,
  meeting_time time not null,
  location text not null,
  agenda_notes text,
  post_meeting_notes text,
  status text not null default 'draft' check (status in ('draft', 'published', 'completed')),
  created_at timestamptz default now()
);

alter table jwl_meetings enable row level security;

-- Members can read published/completed meetings
create policy "members read meetings" on jwl_meetings
  for select using (status in ('published', 'completed'));

create table jwl_meeting_rsvps (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references jwl_meetings(id) on delete cascade,
  member_id uuid not null references jwl_members(id) on delete cascade,
  response text not null check (response in ('yes', 'no')),
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(meeting_id, member_id)
);

alter table jwl_meeting_rsvps enable row level security;

-- Members can read RSVPs for meetings they can see (to display attendee list)
create policy "members read rsvps" on jwl_meeting_rsvps
  for select using (true);
