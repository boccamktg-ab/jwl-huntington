-- Fix RSVP rows that were auto-seeded as 'no' instead of null.
-- Resets upcoming meetings only — past meetings are left as-is.
-- Members who explicitly clicked 'no' via email will also be reset;
-- they'll simply appear as "not yet responded" again.
update jwl_meeting_rsvps r
set response = null
where r.response = 'no'
  and exists (
    select 1 from jwl_meetings m
    where m.id = r.meeting_id
      and m.meeting_date >= current_date
      and m.status = 'published'
  );
