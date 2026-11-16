-- AI narrator audio for stories: one row per generated paragraph, for monthly
-- allowances (counted per story) and to stop the same part being generated over and over.
create table if not exists public.story_audio (
  id bigserial primary key,
  user_id text not null references "user" (id) on delete cascade,
  session_id uuid not null references public.daily_sessions (id) on delete cascade,
  part int not null check (part >= 0 and part < 500),
  chars int not null default 0,
  model text not null check (char_length(model) <= 80),
  created_at timestamptz not null default now()
);
create index if not exists story_audio_user_idx on public.story_audio (user_id, created_at desc);
create index if not exists story_audio_session_idx on public.story_audio (session_id, part);
alter table public.story_audio enable row level security;
