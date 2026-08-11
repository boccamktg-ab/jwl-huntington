CREATE TABLE IF NOT EXISTS backpack_signups (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  email        text NOT NULL,
  mobile       text NOT NULL,
  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'confirmed', 'waitlisted')),
  certificate_sent boolean NOT NULL DEFAULT false,
  reminder_sent    boolean NOT NULL DEFAULT false,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE backpack_signups ENABLE ROW LEVEL SECURITY;
-- Service role bypasses RLS; no public read access needed.
