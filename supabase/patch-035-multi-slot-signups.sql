-- Allow JJWL members to sign up for multiple time slots in one event.
-- Replaces the blanket UNIQUE(event_id, member_id) with two partial indexes:
--   1. One row per member per event when the event has no time slots (time_slot IS NULL)
--   2. One row per member per slot when the event has time slots (time_slot IS NOT NULL)

ALTER TABLE jjwl_signups DROP CONSTRAINT IF EXISTS jjwl_signups_event_id_member_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS jjwl_signups_no_slot_unique
  ON jjwl_signups(event_id, member_id)
  WHERE time_slot IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS jjwl_signups_with_slot_unique
  ON jjwl_signups(event_id, member_id, time_slot)
  WHERE time_slot IS NOT NULL;
