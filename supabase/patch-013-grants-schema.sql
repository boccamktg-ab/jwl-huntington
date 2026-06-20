-- ─── Grant Applications ───────────────────────────────────────────────────────
create table grant_applications (
  id               uuid primary key default gen_random_uuid(),
  grant_type       text not null check (grant_type in ('charitable_children', 'lift_fund')),
  status           text not null default 'draft'
                     check (status in ('draft', 'submitted', 'needs_more_info', 'under_review', 'approved', 'denied', 'paid_closed')),
  requested_amount numeric(10,2) not null,
  approved_amount  numeric(10,2),
  denial_reason    text,
  referrer_id      uuid not null references social_workers(id),
  reviewer_id      uuid references jwl_members(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  submitted_at     timestamptz,
  closed_at        timestamptz
);

-- ─── Grant Application Details ────────────────────────────────────────────────
-- Stores beneficiary/applicant info for both grant types in one table.
-- Charitable Children fields: beneficiary_name, dob, address, attends_huntington_school,
--   justification, financial_narrative.
-- Lift Fund fields: applicant_name, household_composition, address,
--   attends_huntington_school, crisis_description, sustainability_statement,
--   confidential (flag for anonymity handling), confidentiality_notes.
create table grant_application_details (
  id                         uuid primary key default gen_random_uuid(),
  application_id             uuid not null unique references grant_applications(id) on delete cascade,

  -- Shared fields
  beneficiary_name           text not null,
  address                    text not null,
  attends_huntington_school  boolean not null default false, -- exception checkbox for residency
  justification              text not null,

  -- Charitable Children specific
  dob                        date,                 -- used for age check and lifetime-cap matching
  financial_narrative        text,

  -- Lift Fund specific
  household_composition      text,
  crisis_description         text,
  sustainability_statement   text,
  confidential               boolean not null default false,
  confidentiality_notes      text
);

-- ─── Grant Documents ──────────────────────────────────────────────────────────
-- Required for Lift Fund; optional for Charitable Children.
create table grant_documents (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references grant_applications(id) on delete cascade,
  file_url       text not null,      -- Supabase Storage URL
  file_name      text not null,
  uploaded_by    uuid not null references social_workers(id),
  uploaded_at    timestamptz not null default now()
);

-- ─── Grant Messages ───────────────────────────────────────────────────────────
-- Threaded dialogue between referrer and reviewer, attached to an application.
create table grant_messages (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references grant_applications(id) on delete cascade,
  author_id      uuid not null references auth.users(id),
  body           text not null,
  created_at     timestamptz not null default now()
);

-- ─── Updated-at trigger ──────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger grant_applications_updated_at
  before update on grant_applications
  for each row execute function set_updated_at();

-- ─── Row Level Security ──────────────────────────────────────────────────────
alter table grant_applications        enable row level security;
alter table grant_application_details enable row level security;
alter table grant_documents           enable row level security;
alter table grant_messages            enable row level security;

-- Grant Applications
-- Referrers see their own applications
create policy "ga_referrer_read" on grant_applications for select
  using (referrer_id = current_social_worker_id());
create policy "ga_referrer_insert" on grant_applications for insert
  with check (referrer_id = current_social_worker_id() and is_approved_social_worker());
create policy "ga_referrer_update_draft" on grant_applications for update
  using (referrer_id = current_social_worker_id() and status = 'draft');

-- Reviewers see all submitted+ applications
create policy "ga_reviewer_read" on grant_applications for select
  using (is_grants_reviewer());
create policy "ga_reviewer_update" on grant_applications for update
  using (is_grants_reviewer());

-- Grant Application Details (access mirrors parent application)
create policy "gad_referrer_read" on grant_application_details for select
  using (application_id in (
    select id from grant_applications where referrer_id = current_social_worker_id()
  ));
create policy "gad_referrer_insert" on grant_application_details for insert
  with check (application_id in (
    select id from grant_applications where referrer_id = current_social_worker_id()
  ));
create policy "gad_referrer_update" on grant_application_details for update
  using (application_id in (
    select id from grant_applications
    where referrer_id = current_social_worker_id() and status = 'draft'
  ));
create policy "gad_reviewer_read" on grant_application_details for select
  using (is_grants_reviewer());

-- Grant Documents
create policy "gdoc_referrer_read" on grant_documents for select
  using (application_id in (
    select id from grant_applications where referrer_id = current_social_worker_id()
  ));
create policy "gdoc_referrer_insert" on grant_documents for insert
  with check (
    uploaded_by = current_social_worker_id()
    and application_id in (
      select id from grant_applications where referrer_id = current_social_worker_id()
    )
  );
create policy "gdoc_reviewer_read" on grant_documents for select
  using (is_grants_reviewer());

-- Grant Messages
-- Both referrer and reviewer can read/insert messages on applications they're party to
create policy "gm_referrer_read" on grant_messages for select
  using (application_id in (
    select id from grant_applications where referrer_id = current_social_worker_id()
  ));
create policy "gm_referrer_insert" on grant_messages for insert
  with check (
    author_id = auth.uid()
    and application_id in (
      select id from grant_applications where referrer_id = current_social_worker_id()
    )
  );
create policy "gm_reviewer_read" on grant_messages for select
  using (is_grants_reviewer());
create policy "gm_reviewer_insert" on grant_messages for insert
  with check (author_id = auth.uid() and is_grants_reviewer());
