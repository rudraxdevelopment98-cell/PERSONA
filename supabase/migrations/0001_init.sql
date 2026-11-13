-- PERSONA 90 - initial schema
-- "users" are Supabase Auth users (auth.users). Every application table is keyed
-- to auth.uid() and protected by Row Level Security so a user can only ever
-- read or write their own rows.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  programme_start_date date,
  timezone text not null default 'UTC' check (char_length(timezone) <= 64),
  development_profile jsonb,
  roadmap jsonb,
  coach_journal_access boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile automatically when a user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Assessment
-- ---------------------------------------------------------------------------
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'baseline' check (kind in ('baseline', 'checkpoint')),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  scores jsonb,
  reflections jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create index assessments_user_idx on public.assessments (user_id, started_at desc);

create table public.assessment_responses (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id text not null check (char_length(question_id) <= 32),
  dimension text not null,
  value smallint not null check (value between 1 and 5),
  created_at timestamptz not null default now(),
  unique (assessment_id, question_id)
);
create index assessment_responses_user_idx on public.assessment_responses (user_id);

-- ---------------------------------------------------------------------------
-- Daily check-in
-- ---------------------------------------------------------------------------
create table public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day_number smallint not null check (day_number between 1 and 90),
  checkin_date date not null,
  questions jsonb not null,
  answers jsonb,
  analysis jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, checkin_date)
);
create index daily_checkins_user_idx on public.daily_checkins (user_id, checkin_date desc);

-- ---------------------------------------------------------------------------
-- Daily learning session
-- ---------------------------------------------------------------------------
create table public.daily_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day_number smallint not null check (day_number between 1 and 90),
  session_date date not null,
  focus_skill text not null,
  introduction jsonb not null,
  scenarios jsonb not null,
  challenge jsonb not null,
  reflection_questions jsonb not null,
  story_progress smallint not null default 0 check (story_progress between 0 and 100),
  story_completed_at timestamptz,
  scenarios_completed_at timestamptz,
  challenge_status text not null default 'pending' check (challenge_status in ('pending', 'completed', 'skipped')),
  challenge_notes text check (char_length(challenge_notes) <= 4000),
  challenge_updated_at timestamptz,
  reflection_answers jsonb,
  reflection_feedback jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, day_number)
);
create index daily_sessions_user_idx on public.daily_sessions (user_id, day_number desc);

create table public.generated_stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid references public.daily_sessions (id) on delete cascade,
  title text not null,
  body text not null,
  word_count integer not null,
  insights jsonb not null default '[]'::jsonb,
  target_skills text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index generated_stories_user_idx on public.generated_stories (user_id, created_at desc);
create unique index generated_stories_session_idx on public.generated_stories (session_id);

-- ---------------------------------------------------------------------------
-- Practice: scenarios, exercises, decisions
-- ---------------------------------------------------------------------------
create table public.scenario_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid references public.daily_sessions (id) on delete cascade,
  scenario_index smallint not null,
  skill text not null,
  choice_id text not null check (char_length(choice_id) <= 16),
  reasoning text not null check (char_length(reasoning) <= 4000),
  response_time_ms integer check (response_time_ms >= 0),
  evaluation jsonb,
  score smallint check (score between 0 and 100),
  created_at timestamptz not null default now(),
  unique (session_id, scenario_index)
);
create index scenario_responses_user_idx on public.scenario_responses (user_id, created_at desc);

create table public.exercise_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_type text not null,
  skill text not null,
  prompt jsonb not null,
  response text check (char_length(response) <= 6000),
  evaluation jsonb,
  score smallint check (score between 0 and 100),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index exercise_completions_user_idx on public.exercise_completions (user_id, created_at desc);

create table public.decision_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null,
  difficulty text not null check (difficulty in ('everyday', 'moderate', 'high_stakes')),
  scenario jsonb not null,
  chosen_option text check (char_length(chosen_option) <= 16),
  reasoning text check (char_length(reasoning) <= 4000),
  confidence smallint check (confidence between 1 and 10),
  first_choice_ms integer check (first_choice_ms >= 0),
  total_time_ms integer check (total_time_ms >= 0),
  choice_changes smallint check (choice_changes >= 0),
  evaluation jsonb,
  score smallint check (score between 0 and 100),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index decision_logs_user_idx on public.decision_logs (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Scores and progress
-- ---------------------------------------------------------------------------
-- Append-only history. Rows are only written when a real event changes a score;
-- charts read this table directly, so nothing is ever back-filled or invented.
create table public.personality_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  dimension text not null,
  score numeric(5, 2) not null check (score between 0 and 100),
  self_reported numeric(5, 2),
  demonstrated numeric(5, 2),
  consistency numeric(5, 2),
  source text not null,
  explanation text,
  recorded_at timestamptz not null default now()
);
create index personality_scores_user_idx on public.personality_scores (user_id, dimension, recorded_at);

create table public.skill_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  dimension text not null,
  baseline numeric(5, 2) not null,
  current numeric(5, 2) not null,
  self_reported numeric(5, 2),
  demonstrated numeric(5, 2),
  consistency numeric(5, 2),
  evidence_count integer not null default 0,
  explanation text,
  updated_at timestamptz not null default now(),
  primary key (user_id, dimension)
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code text not null,
  title text not null,
  description text not null,
  earned_at timestamptz not null default now(),
  unique (user_id, code)
);

-- ---------------------------------------------------------------------------
-- Journal (private)
-- ---------------------------------------------------------------------------
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  body text not null check (char_length(body) <= 20000),
  entry_type text not null default 'reflection'
    check (entry_type in ('reflection', 'observation', 'decision', 'emotion', 'lesson')),
  mood smallint check (mood between 1 and 10),
  tags text[] not null default '{}',
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(body, '')), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index journal_entries_user_idx on public.journal_entries (user_id, created_at desc);
create index journal_entries_search_idx on public.journal_entries using gin (search);
create trigger journal_entries_updated_at before update on public.journal_entries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- AI coach conversation
-- ---------------------------------------------------------------------------
create table public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 20000),
  created_at timestamptz not null default now()
);
create index coach_messages_user_idx on public.coach_messages (user_id, created_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
create policy "profiles: own row select" on public.profiles for select using (id = auth.uid());
create policy "profiles: own row update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array[
    'assessments', 'assessment_responses', 'daily_checkins', 'daily_sessions',
    'generated_stories', 'scenario_responses', 'exercise_completions', 'decision_logs',
    'personality_scores', 'skill_progress', 'achievements', 'journal_entries', 'coach_messages'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s: own rows select" on public.%1$I for select using (user_id = auth.uid())', t);
    execute format('create policy "%1$s: own rows insert" on public.%1$I for insert with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s: own rows update" on public.%1$I for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s: own rows delete" on public.%1$I for delete using (user_id = auth.uid())', t);
  end loop;
end $$;

-- Score history is append-only from the client's point of view.
drop policy "personality_scores: own rows update" on public.personality_scores;

-- ---------------------------------------------------------------------------
-- Account deletion: removes the auth user; every table cascades.
-- ---------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = uid;
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
