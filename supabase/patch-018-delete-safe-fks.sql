-- Make FK columns nullable and set to SET NULL on delete
-- so user records can be hard-deleted while preserving associated data

-- families.social_worker_id
alter table families
  drop constraint if exists families_social_worker_id_fkey,
  alter column social_worker_id drop not null;
alter table families
  add constraint families_social_worker_id_fkey
  foreign key (social_worker_id) references social_workers(id) on delete set null;

-- grant_applications.referrer_id
alter table grant_applications
  drop constraint if exists grant_applications_referrer_id_fkey,
  alter column referrer_id drop not null;
alter table grant_applications
  add constraint grant_applications_referrer_id_fkey
  foreign key (referrer_id) references social_workers(id) on delete set null;

-- grant_documents.uploaded_by
alter table grant_documents
  drop constraint if exists grant_documents_uploaded_by_fkey,
  alter column uploaded_by drop not null;
alter table grant_documents
  add constraint grant_documents_uploaded_by_fkey
  foreign key (uploaded_by) references social_workers(id) on delete set null;

-- assignments.jwl_member_id
alter table assignments
  drop constraint if exists assignments_jwl_member_id_fkey,
  alter column jwl_member_id drop not null;
alter table assignments
  add constraint assignments_jwl_member_id_fkey
  foreign key (jwl_member_id) references jwl_members(id) on delete set null;

-- jjwl_signups.member_id: change from CASCADE to SET NULL
alter table jjwl_signups
  drop constraint if exists jjwl_signups_member_id_fkey,
  alter column member_id drop not null;
alter table jjwl_signups
  add constraint jjwl_signups_member_id_fkey
  foreign key (member_id) references jjwl_members(id) on delete set null;
