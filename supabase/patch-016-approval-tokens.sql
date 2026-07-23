-- One-time approval tokens for admin email links
create table if not exists approval_tokens (
  id           uuid primary key default gen_random_uuid(),
  token        text unique not null,
  entity_type  text not null check (entity_type in ('social_worker', 'jwl_member')),
  entity_id    uuid not null,
  used_at      timestamptz,
  expires_at   timestamptz not null,
  created_at   timestamptz default now()
);

create index if not exists approval_tokens_token_idx on approval_tokens (token);
