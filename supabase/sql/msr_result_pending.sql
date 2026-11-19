-- Private holding area for AI-extracted screenshots. Not a public results table.
-- Complete MSL Bo3s can be auto_ready for publication; uncertain entries stay held.
create table if not exists public.msr_result_pending (
  message_id text primary key,
  channel_id text not null,
  source_timestamp timestamptz,
  content text not null default '',
  image_urls jsonb not null default '[]'::jsonb,
  extracted_match jsonb,
  issues jsonb not null default '[]'::jsonb,
  status text not null default 'processing'
    check (status in ('processing','pending_review','needs_info','auto_ready','published','approved','rejected','error')),
  model text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Idempotent upgrade for installations that already had the review-only status list.
alter table public.msr_result_pending drop constraint if exists msr_result_pending_status_check;
alter table public.msr_result_pending add constraint msr_result_pending_status_check
  check (status in ('processing','pending_review','needs_info','auto_ready','published','approved','rejected','error'));
alter table public.msr_result_pending enable row level security;
revoke all on public.msr_result_pending from public, anon, authenticated;
grant select, insert, update, delete on public.msr_result_pending to service_role;
