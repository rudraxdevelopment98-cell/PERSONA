-- Private persona signals: what the app keeps INSTEAD of people's own words.
-- Raw text is wiped after a short window; only closed-vocabulary tags and numbers stay.

create table if not exists public.signal_events (
  id bigserial primary key,
  user_id text not null references "user" (id) on delete cascade,
  source text not null check (source in ('checkin', 'reflection', 'challenge', 'story_line', 'scenario', 'decision', 'communication', 'coach', 'assessment')),
  ref_id text not null check (char_length(ref_id) <= 80),
  created_at timestamptz not null default now(),
  life_area text check (char_length(life_area) <= 20),
  roles text[] not null default '{}',
  emotions text[] not null default '{}',
  themes text[] not null default '{}',
  patterns text[] not null default '{}',
  decision_style text check (char_length(decision_style) <= 20),
  stress smallint check (stress between 0 and 10),
  confidence smallint check (confidence between 0 and 10),
  mood smallint check (mood between -2 and 2),
  skills jsonb not null default '{}',
  unique (source, ref_id)
);
create index if not exists signal_events_user_idx on public.signal_events (user_id, created_at desc);
alter table public.signal_events enable row level security;

create table if not exists public.persona_profiles (
  user_id text primary key references "user" (id) on delete cascade,
  updated_at timestamptz not null default now(),
  events int not null default 0,
  archetype text,
  archetype_scores jsonb not null default '{}',
  tags jsonb not null default '{}',
  stress numeric(4, 2),
  confidence numeric(4, 2),
  mood numeric(4, 2),
  skills jsonb not null default '{}',
  levels jsonb not null default '{}',
  decision_level smallint,
  decision_style text
);
alter table public.persona_profiles enable row level security;

-- When each source row's own words were wiped.
alter table public.daily_checkins add column if not exists redacted_at timestamptz;
alter table public.daily_sessions add column if not exists redacted_at timestamptz;
alter table public.scenario_responses add column if not exists redacted_at timestamptz;
alter table public.exercise_completions add column if not exists redacted_at timestamptz;
alter table public.decision_logs add column if not exists redacted_at timestamptz;
alter table public.assessments add column if not exists redacted_at timestamptz;
alter table public.generated_stories add column if not exists redacted_at timestamptz;

drop policy if exists "signal_events: own" on public.signal_events;
create policy "signal_events: own" on public.signal_events for select using (user_id = public.app_current_user());
drop policy if exists "persona_profiles: own" on public.persona_profiles;
create policy "persona_profiles: own" on public.persona_profiles for select using (user_id = public.app_current_user());
