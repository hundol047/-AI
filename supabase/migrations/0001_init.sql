-- TraceAgent initial schema
-- Run this in the Supabase SQL editor, or via `supabase db push`.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- agent_runs: one row per Playground / demo agent execution
-- ---------------------------------------------------------------------------
create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_request text not null,
  status text not null check (status in ('running', 'completed', 'failed')),
  scenario text not null check (scenario in ('normal', 'auth_error', 'outdated_source', 'tool_timeout')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_runs_created_at on agent_runs (created_at desc);
create index if not exists idx_agent_runs_status on agent_runs (status);

-- ---------------------------------------------------------------------------
-- trace_events: one row per pipeline step (user_request/plan/search/tool_call/result)
-- ---------------------------------------------------------------------------
create table if not exists trace_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references agent_runs (id) on delete cascade,
  step text not null check (step in ('user_request', 'plan', 'search', 'tool_call', 'result')),
  status text not null check (status in ('pending', 'running', 'completed', 'failed', 'skipped')),
  tool_name text,
  input jsonb,
  output jsonb,
  error jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_ms integer,
  unique (run_id, step)
);

create index if not exists idx_trace_events_run_id on trace_events (run_id);

-- ---------------------------------------------------------------------------
-- failure_analyses: AI-generated Root Cause Analysis for a failed run
-- ---------------------------------------------------------------------------
create table if not exists failure_analyses (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references agent_runs (id) on delete cascade,
  failure_type text not null,
  root_cause text not null,
  risk_level text not null check (risk_level in ('LOW', 'MEDIUM', 'HIGH')),
  explanation text not null,
  recommended_fix text not null,
  fix_steps jsonb not null default '[]'::jsonb,
  patch_suggestion text,
  source text not null default 'openai' check (source in ('openai', 'mock')),
  created_at timestamptz not null default now()
);

create index if not exists idx_failure_analyses_run_id on failure_analyses (run_id);

-- ---------------------------------------------------------------------------
-- replays: links an original failed run to the Fix & Replay run it produced
-- ---------------------------------------------------------------------------
create table if not exists replays (
  id uuid primary key default gen_random_uuid(),
  original_run_id uuid not null references agent_runs (id) on delete cascade,
  replay_run_id uuid not null references agent_runs (id) on delete cascade,
  fix_applied jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_replays_original_run_id on replays (original_run_id);

-- ---------------------------------------------------------------------------
-- Row Level Security: the app only ever talks to Supabase via the service
-- role key from server-side API routes, so RLS stays enabled with no public
-- policies (service role bypasses RLS by design).
-- ---------------------------------------------------------------------------
alter table agent_runs enable row level security;
alter table trace_events enable row level security;
alter table failure_analyses enable row level security;
alter table replays enable row level security;
