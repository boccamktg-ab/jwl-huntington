-- When a JJWL member is deleted, preserve their signup rows as cancelled
-- so event rosters don't silently lose entries.
-- Also store member_name snapshot so the row remains legible after deletion.

ALTER TABLE jjwl_signups
  ADD COLUMN IF NOT EXISTS member_name text;

-- Make member_id nullable so rows survive member deletion
ALTER TABLE jjwl_signups
  ALTER COLUMN member_id DROP NOT NULL;

-- Change FK from CASCADE to SET NULL
ALTER TABLE jjwl_signups
  DROP CONSTRAINT IF EXISTS jjwl_signups_member_id_fkey;

ALTER TABLE jjwl_signups
  ADD CONSTRAINT jjwl_signups_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES jjwl_members(id) ON DELETE SET NULL;
