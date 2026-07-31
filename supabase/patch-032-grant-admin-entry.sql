-- patch-032: assigned SW for admin-entered grants

-- Optional social worker assignment — separate from the external referrer contact.
-- When set, the SW sees this application in their grants dashboard and can
-- manage it as if they had submitted it themselves.
alter table grant_applications
  add column if not exists assigned_sw_id uuid references social_workers(id) on delete set null;

-- Allow the SW to see applications assigned to them by an admin
-- (existing referrer_id policy already covers cases they created themselves)
drop policy if exists "ga_assigned_sw_read" on grant_applications;
create policy "ga_assigned_sw_read" on grant_applications for select
  using (assigned_sw_id = current_social_worker_id());

drop policy if exists "ga_assigned_sw_update" on grant_applications;
create policy "ga_assigned_sw_update" on grant_applications for update
  using (assigned_sw_id = current_social_worker_id());

-- SW can read details for assigned applications
drop policy if exists "gad_assigned_sw_read" on grant_application_details;
create policy "gad_assigned_sw_read" on grant_application_details for select
  using (application_id in (
    select id from grant_applications where assigned_sw_id = current_social_worker_id()
  ));

-- SW can read documents for assigned applications
drop policy if exists "gdoc_assigned_sw_read" on grant_documents;
create policy "gdoc_assigned_sw_read" on grant_documents for select
  using (application_id in (
    select id from grant_applications where assigned_sw_id = current_social_worker_id()
  ));

-- SW can message on assigned applications
drop policy if exists "gm_assigned_sw_read" on grant_messages;
create policy "gm_assigned_sw_read" on grant_messages for select
  using (application_id in (
    select id from grant_applications where assigned_sw_id = current_social_worker_id()
  ));

drop policy if exists "gm_assigned_sw_insert" on grant_messages;
create policy "gm_assigned_sw_insert" on grant_messages for insert
  with check (application_id in (
    select id from grant_applications where assigned_sw_id = current_social_worker_id()
  ));

-- SW can read household members for assigned applications
drop policy if exists "ghm_assigned_sw_read" on grant_household_members;
create policy "ghm_assigned_sw_read" on grant_household_members for select
  using (application_id in (
    select id from grant_applications where assigned_sw_id = current_social_worker_id()
  ));
