-- Add 'draft' to jjwl_events status options
ALTER TABLE jjwl_events DROP CONSTRAINT IF EXISTS jjwl_events_status_check;
ALTER TABLE jjwl_events ADD CONSTRAINT jjwl_events_status_check
  CHECK (status IN ('draft', 'active', 'sunset'));
