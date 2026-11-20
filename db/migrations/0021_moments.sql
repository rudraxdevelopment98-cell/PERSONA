-- Social 2: profile cards, 24-hour moments and friend streaks.
--
-- Moments are built by the server from real progress (a finished day, a streak, a badge...).
-- The owner only picks which one, a cover and an optional caption. Who can see a moment
-- follows the owner's sharing settings for that kind of progress.

alter table public.profiles
  add column if not exists avatar_emoji text check (char_length(avatar_emoji) <= 16),
  add column if not exists cover text check (char_length(cover) <= 20),
  add column if not exists bio text check (char_length(bio) <= 80),
  add column if not exists pinned_badges text[] not null default '{}';

-- Identity on the shared snapshot (always visible to connections unless sharing is paused).
alter table public.share_snapshots
  add column if not exists avatar_emoji text,
  add column if not exists cover text,
  add column if not exists bio text,
  add column if not exists pinned_badges text[] not null default '{}';

create table if not exists public.moments (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user" (id) on delete cascade,
  kind text not null check (kind in ('day', 'streak', 'badge', 'level', 'challenge', 'progress', 'growth')),
  data jsonb not null default '{}'::jsonb,
  cover text not null default 'sunrise' check (char_length(cover) <= 20),
  caption text check (char_length(caption) <= 100),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);
create index if not exists moments_user_idx on public.moments (user_id, expires_at desc);

create table if not exists public.moment_views (
  moment_id uuid not null references public.moments (id) on delete cascade,
  viewer text not null references "user" (id) on delete cascade,
  reaction text check (reaction in ('fire', 'strong', 'proud', 'clap', 'heart', 'wow')),
  viewed_at timestamptz not null default now(),
  primary key (moment_id, viewer)
);
create index if not exists moment_views_viewer_idx on public.moment_views (viewer);

alter table public.moments enable row level security;
alter table public.moment_views enable row level security;
drop policy if exists "moments: own" on public.moments;
create policy "moments: own" on public.moments for select using (user_id = public.app_current_user());
drop policy if exists "moment_views: own" on public.moment_views;
create policy "moment_views: own" on public.moment_views for select using (viewer = public.app_current_user());
grant select on public.moments, public.moment_views to app_user;
