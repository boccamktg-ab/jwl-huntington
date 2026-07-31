-- patch-031: expanded Lift Fund fields, new statuses, intake source tracking

-- New application statuses
alter table grant_applications
  drop constraint if exists grant_applications_status_check;

alter table grant_applications
  add constraint grant_applications_status_check
    check (status in (
      'draft', 'submitted', 'needs_more_info', 'under_review',
      'approved', 'denied', 'paid_closed',
      'pending_transcription', 'incomplete'
    ));

-- Source tracking
alter table grant_applications
  add column if not exists source text
    check (source in ('social_worker', 'admin_entered', 'admin_quick_add', 'admin_scan'))
    default 'social_worker',
  add column if not exists admin_referrer_name text,
  add column if not exists admin_referrer_org  text,
  add column if not exists admin_referrer_phone text,
  add column if not exists admin_referrer_email text,
  add column if not exists admin_notes text;

-- Lift Fund structured fields on grant_application_details
alter table grant_application_details
  -- Applicant info
  add column if not exists applicant_phone        text,
  add column if not exists applicant_email        text,
  add column if not exists housing_status         text check (housing_status in ('rented', 'owned')),
  add column if not exists residence_length       text,
  add column if not exists occupation             text,
  add column if not exists employer               text,
  add column if not exists employer_address       text,
  add column if not exists annual_salary          text,
  add column if not exists weekly_salary          text,
  add column if not exists employment_type        text check (employment_type in ('full_time', 'part_time', 'not_employed', 'other')),
  add column if not exists hours_per_week         text,

  -- Public assistance (amounts stored as text to allow N/A)
  add column if not exists assistance_medicaid    boolean default false,
  add column if not exists assistance_medicaid_amt text,
  add column if not exists assistance_adc         boolean default false,
  add column if not exists assistance_adc_amt     text,
  add column if not exists assistance_snap        boolean default false,
  add column if not exists assistance_snap_amt    text,
  add column if not exists assistance_wic         boolean default false,
  add column if not exists assistance_wic_amt     text,
  add column if not exists assistance_ssi         boolean default false,
  add column if not exists assistance_ssi_amt     text,
  add column if not exists assistance_unemployment boolean default false,
  add column if not exists assistance_unemployment_amt text,
  add column if not exists assistance_section8    boolean default false,
  add column if not exists assistance_section8_amt text,
  add column if not exists assistance_heap        boolean default false,
  add column if not exists assistance_heap_amt    text,
  add column if not exists other_assistance       text,

  -- Income / expenses
  add column if not exists income_expenses_narrative text,

  -- Presenting problem
  add column if not exists presenting_problem     text,

  -- First request
  add column if not exists first_request          boolean,
  add column if not exists prior_request_explanation text,

  -- Referral source (portal equivalent of paper form signature section)
  add column if not exists referral_name          text,
  add column if not exists referral_title         text,
  add column if not exists referral_org           text,
  add column if not exists referral_phone         text,
  add column if not exists referral_email         text,
  add column if not exists referral_date          date,
  add column if not exists referral_attestation   boolean default false,
  add column if not exists consent_disclosure     boolean default false;

-- Reviewer insert policy for grant_application_details (needed for admin quick-add)
drop policy if exists "gad_reviewer_all" on grant_application_details;
create policy "gad_reviewer_all" on grant_application_details for all
  using (is_grants_reviewer())
  with check (is_grants_reviewer());

-- Allow admin uploads (uploaded_by can be null for non-SW uploads)
alter table grant_documents
  alter column uploaded_by drop not null;

-- Household composition rows (replaces free-text field for Lift Fund)
create table if not exists grant_household_members (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references grant_applications(id) on delete cascade,
  full_name      text not null,
  age            text,
  married        boolean,
  sort_order     int not null default 0
);

alter table grant_household_members enable row level security;

-- Referrers can read/write household members for their own applications
create policy "ghm_referrer_read" on grant_household_members for select
  using (application_id in (
    select id from grant_applications where referrer_id = current_social_worker_id()
  ));

create policy "ghm_referrer_insert" on grant_household_members for insert
  with check (application_id in (
    select id from grant_applications where referrer_id = current_social_worker_id()
  ));

create policy "ghm_referrer_delete" on grant_household_members for delete
  using (application_id in (
    select id from grant_applications where referrer_id = current_social_worker_id()
  ));

-- Reviewers (grants role) can read all household members
create policy "ghm_reviewer_read" on grant_household_members for select
  using (is_grants_reviewer());
