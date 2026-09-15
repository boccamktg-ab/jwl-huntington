-- Drop the not-null constraint so response can be null (no response yet)
alter table jwl_meeting_rsvps alter column response drop not null;

-- Reset auto-seeded 'no' rows on upcoming published meetings to null
update jwl_meeting_rsvps r
set response = null
where r.response = 'no'
  and exists (
    select 1 from jwl_meetings m
    where m.id = r.meeting_id
      and m.meeting_date >= current_date
      and m.status = 'published'
  );
