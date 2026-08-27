-- Add 'finalized' as a valid event status
alter table jjwl_events drop constraint if exists jjwl_events_status_check;
alter table jjwl_events add constraint jjwl_events_status_check
  check (status in ('draft', 'active', 'sunset', 'finalized'));
