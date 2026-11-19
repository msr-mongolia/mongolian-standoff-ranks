-- Private holding area for AI-extracted screenshots. Not a public results table.
-- Requires staff verification before a match is written to either site ledger.
create table if not exists public.msr_result_pending (
  message_id text primary key,
  channel_id text not null,
  source_timestamp timestamptz,
  content text not null default '',
  image_urls jsonb not null default '[]'::jsonb,
  extracted_match jsonb,
  issues jsonb not null default '[]'::jsonb,
  status text not null default 'processing'
    check (status in ('processing','pending_review','needs_info','approved','rejected','error')),
  model text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.msr_result_pending enable row level security;
revoke all on public.msr_result_pending from public, anon, authenticated;
grant select, insert, update, delete on public.msr_result_pending to service_role;
