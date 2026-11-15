-- Every AI call: tokens and estimated cost, for the admin cost dashboard.
create table if not exists public.ai_usage (
  id bigserial primary key,
  user_id text references "user" (id) on delete set null,
  feature text not null check (char_length(feature) <= 60),
  tier text not null check (tier in ('free', 'pro', 'byo', 'system')),
  provider text not null check (char_length(provider) <= 20),
  model text not null check (char_length(model) <= 80),
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  ok boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_created_idx on public.ai_usage (created_at desc);
create index if not exists ai_usage_user_idx on public.ai_usage (user_id, created_at desc);
alter table public.ai_usage enable row level security;
