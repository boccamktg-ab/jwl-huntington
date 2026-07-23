-- JJWL module schema
-- Run in Supabase SQL editor

-- ─── JJWL admin flag on existing members table ───────────────────────────────
ALTER TABLE jwl_members ADD COLUMN IF NOT EXISTS is_jjwl_admin boolean NOT NULL DEFAULT false;

-- ─── CheddarUp payment link (site-wide setting) ──────────────────────────────
-- Store in app_settings under key 'jjwl_cheddarup_url'
-- (app_settings table already exists from patch-011)

-- ─── jjwl_members ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jjwl_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name          text NOT NULL,
  school_id     uuid REFERENCES schools(id) ON DELETE SET NULL,
  grade         text NOT NULL,
  phone         text NOT NULL,
  email         text NOT NULL,
  parent_name   text,
  parent_phone  text,
  parent_email  text,
  status        text NOT NULL DEFAULT 'pending_approval'
                  CHECK (status IN ('pending_approval','approved_unpaid','active','inactive')),
  membership_paid boolean NOT NULL DEFAULT false,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  approved_at   timestamptz,
  approved_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ─── jjwl_events ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jjwl_events (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                 text NOT NULL,
  location              text NOT NULL,
  event_date            date NOT NULL,
  start_time            time NOT NULL,
  end_time              time,
  volunteer_slots_total integer NOT NULL DEFAULT 0,
  time_slots            jsonb,        -- optional array of {label, capacity} objects
  credit_hours          numeric(5,2) NOT NULL DEFAULT 1,
  description           text,
  status                text NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','sunset')),
  created_by            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ─── jjwl_signups ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jjwl_signups (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         uuid NOT NULL REFERENCES jjwl_events(id) ON DELETE CASCADE,
  member_id        uuid NOT NULL REFERENCES jjwl_members(id) ON DELETE CASCADE,
  time_slot        text,             -- which slot label, if applicable
  status           text NOT NULL DEFAULT 'signed_up'
                     CHECK (status IN ('signed_up','cancelled','confirmed_attended','no_show','admin_added')),
  hours_awarded    numeric(5,2),     -- populated after admin confirms attendance
  signed_up_at     timestamptz NOT NULL DEFAULT now(),
  confirmed_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at     timestamptz,
  UNIQUE(event_id, member_id)
);

-- ─── jjwl_hour_adjustments (audit trail) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS jjwl_hour_adjustments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id    uuid NOT NULL REFERENCES jjwl_members(id) ON DELETE CASCADE,
  delta        numeric(5,2) NOT NULL,   -- positive = add, negative = subtract
  reason       text NOT NULL,
  adjusted_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  adjusted_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── jjwl_notifications_log ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jjwl_notifications_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger     text NOT NULL,           -- e.g. 'registration_submitted', 'registration_approved', 'event_reminder'
  recipient   text NOT NULL,           -- email address
  member_id   uuid REFERENCES jjwl_members(id) ON DELETE SET NULL,
  event_id    uuid REFERENCES jjwl_events(id) ON DELETE SET NULL,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  success     boolean NOT NULL DEFAULT true,
  error       text
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE jjwl_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE jjwl_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE jjwl_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE jjwl_hour_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE jjwl_notifications_log ENABLE ROW LEVEL SECURITY;

-- Service role (used by API routes) bypasses RLS automatically.
-- Add permissive policies for authenticated users to read their own data.

-- jjwl_members: members can read their own row
CREATE POLICY "jjwl_members_self_read" ON jjwl_members
  FOR SELECT TO authenticated
  USING (auth_id = auth.uid());

-- jjwl_events: active members can read active events
CREATE POLICY "jjwl_events_active_read" ON jjwl_events
  FOR SELECT TO authenticated
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1 FROM jjwl_members
      WHERE auth_id = auth.uid()
      AND status = 'active'
    )
  );

-- jjwl_signups: members can read their own signups
CREATE POLICY "jjwl_signups_self_read" ON jjwl_signups
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jjwl_members
      WHERE jjwl_members.id = jjwl_signups.member_id
      AND jjwl_members.auth_id = auth.uid()
    )
  );

-- ─── Helper function: current JJWL member id ─────────────────────────────────
CREATE OR REPLACE FUNCTION current_jjwl_member_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT id FROM jjwl_members WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- ─── Index for common queries ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS jjwl_members_auth_id_idx ON jjwl_members(auth_id);
CREATE INDEX IF NOT EXISTS jjwl_events_date_idx ON jjwl_events(event_date);
CREATE INDEX IF NOT EXISTS jjwl_events_status_idx ON jjwl_events(status);
CREATE INDEX IF NOT EXISTS jjwl_signups_member_id_idx ON jjwl_signups(member_id);
CREATE INDEX IF NOT EXISTS jjwl_signups_event_id_idx ON jjwl_signups(event_id);
