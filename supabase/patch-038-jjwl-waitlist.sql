-- Allow 'waitlisted' as a valid status for jjwl_members
alter table jjwl_members drop constraint if exists jjwl_members_status_check;
alter table jjwl_members
  add constraint jjwl_members_status_check
  check (status in ('pending_approval', 'approved_unpaid', 'active', 'inactive', 'waitlisted'));
