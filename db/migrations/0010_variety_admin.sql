-- Variety engine: remember what each session used so nothing repeats, and
-- carry a weekly "season" story with recurring characters.
alter table public.daily_sessions add column if not exists variety jsonb;
alter table public.daily_checkins add column if not exists lens text check (char_length(lens) <= 40);
alter table public.profiles add column if not exists next_world text check (char_length(next_world) <= 40);

-- Moderation.
alter table public.profiles add column if not exists suspended_at timestamptz;
alter table public.reports add column if not exists status text not null default 'open' check (status in ('open', 'resolved', 'dismissed'));
alter table public.reports add column if not exists resolved_at timestamptz;
alter table public.reports add column if not exists resolved_by text references "user" (id) on delete set null;
alter table public.reports add column if not exists resolution text check (char_length(resolution) <= 500);
create index if not exists reports_status_idx on public.reports (status, created_at desc);

-- Admins are recorded here (server-side only; app_user has no access).
create table if not exists public.admins (
  user_id text primary key references "user" (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
