-- Apply only after reviewing existing account schema and permissions.
create table if not exists public.msr_access_codes (
 id uuid primary key default gen_random_uuid(),
 discord_user_id text not null unique,
 code_hash text not null unique,
 status text not null default 'pending' check(status in ('pending','active','revoked')),
 auth_user_id uuid unique references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 activated_at timestamptz
);
alter table public.msr_access_codes enable row level security;
revoke all on public.msr_access_codes from anon, authenticated;
-- Only the backend service role can issue, validate or activate codes.
