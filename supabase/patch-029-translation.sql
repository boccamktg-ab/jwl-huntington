-- Add translation columns to children table
alter table children
  add column if not exists gift_requests_en text,
  add column if not exists translation_status text
    check (translation_status in ('pending_review', 'confirmed'));
