-- JJWL waiver table — one per member per season
CREATE TABLE IF NOT EXISTS jjwl_waivers (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id             uuid NOT NULL REFERENCES jjwl_members(id) ON DELETE CASCADE,
  season                text NOT NULL, -- e.g. '2026-2027'
  parent_name           text NOT NULL,
  address               text NOT NULL,
  city                  text NOT NULL,
  zip                   text NOT NULL,
  medical_conditions    text,          -- null = none reported
  medications           text,          -- null = none reported
  emergency_contact     text NOT NULL,
  emergency_phone       text,
  emergency_cell        text,
  photo_consent         boolean NOT NULL DEFAULT true,
  signature             text NOT NULL, -- typed full name of parent/guardian
  completed_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, season)
);

ALTER TABLE jjwl_waivers ENABLE ROW LEVEL SECURITY;

-- Members can read and insert their own waiver
CREATE POLICY "jjwl_waivers_self_read" ON jjwl_waivers FOR SELECT
  USING (member_id = current_jjwl_member_id());

CREATE POLICY "jjwl_waivers_self_insert" ON jjwl_waivers FOR INSERT
  WITH CHECK (member_id = current_jjwl_member_id());
