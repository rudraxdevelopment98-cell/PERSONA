-- Social features: friends, circles, sharing, races, cheers, notifications.
--
-- Privacy model: other people never read raw programme tables. They only see
-- a per-user `share_snapshots` row (numbers, badges, relative growth), filtered
-- by the owner's sharing settings in server code, plus activity COUNTS for races.
-- All social writes go through server code after an auth check; the restricted
-- app_user role may only read its own social rows (for export and badges).

alter table public.profiles add column if not exists social_paused boolean not null default false;

-- ---------------------------------------------------------------------------
-- Sharing
-- ---------------------------------------------------------------------------
create table public.share_settings (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user" (id) on delete cascade,
  circle_id uuid,                                   -- null = default for all friends
  items text[] not null default '{activity,xp,badges}',
  updated_at timestamptz not null default now()
);
create unique index share_settings_audience
  on public.share_settings (user_id, coalesce(circle_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table public.share_snapshots (
  user_id text primary key references "user" (id) on delete cascade,
  display_name text not null,
  timezone text not null default 'UTC',
  programme_day smallint not null default 0,
  phase smallint,
  sessions_completed int not null default 0,
  streak int not null default 0,
  best_streak int not null default 0,
  last_active_date date,
  xp int not null default 0,
  level smallint not null default 1,
  level_name text not null default 'Newcomer',
  challenges_completed int not null default 0,
  badges jsonb not null default '[]'::jsonb,
  growth jsonb not null default '{}'::jsonb,
  scores jsonb not null default '{}'::jsonb,
  focus jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Circles (defined before invites, which can point at a circle)
-- ---------------------------------------------------------------------------
create table public.circles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  emoji text check (char_length(emoji) <= 8),
  owner_id text not null references "user" (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.circle_members (
  circle_id uuid not null references public.circles (id) on delete cascade,
  user_id text not null references "user" (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);
create index circle_members_user_idx on public.circle_members (user_id);

alter table public.share_settings
  add constraint share_settings_circle_fk foreign key (circle_id) references public.circles (id) on delete cascade;

-- ---------------------------------------------------------------------------
-- Connections
-- ---------------------------------------------------------------------------
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  created_by text not null references "user" (id) on delete cascade,
  kind text not null check (kind in ('friend', 'circle')),
  circle_id uuid references public.circles (id) on delete cascade,
  max_uses smallint not null default 5 check (max_uses between 1 and 50),
  uses smallint not null default 0,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check ((kind = 'circle') = (circle_id is not null))
);
create index invites_creator_idx on public.invites (created_by, created_at desc);

create table public.friendships (
  user_low text not null references "user" (id) on delete cascade,
  user_high text not null references "user" (id) on delete cascade,
  status text not null check (status in ('accepted', 'blocked')),
  blocked_by text references "user" (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_low, user_high),
  check (user_low < user_high),
  check ((status = 'blocked') = (blocked_by is not null))
);
create index friendships_high_idx on public.friendships (user_high);

-- ---------------------------------------------------------------------------
-- Races
-- ---------------------------------------------------------------------------
create table public.races (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid references public.circles (id) on delete cascade,  -- null = friend race
  created_by text not null references "user" (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 80),
  kind text not null check (kind in ('streak', 'sessions', 'challenges', 'checkins', 'xp')),
  teams boolean not null default false,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  finalized_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at and ends_at - starts_at <= interval '31 days')
);
create index races_circle_idx on public.races (circle_id, ends_at desc);

create table public.race_participants (
  race_id uuid not null references public.races (id) on delete cascade,
  user_id text not null references "user" (id) on delete cascade,
  team smallint check (team in (1, 2)),
  private boolean not null default false,
  final_score int,
  final_rank smallint,
  joined_at timestamptz not null default now(),
  primary key (race_id, user_id)
);
create index race_participants_user_idx on public.race_participants (user_id);

-- ---------------------------------------------------------------------------
-- Cheers, notifications, push, reports
-- ---------------------------------------------------------------------------
create table public.cheers (
  id uuid primary key default gen_random_uuid(),
  from_user text not null references "user" (id) on delete cascade,
  to_user text not null references "user" (id) on delete cascade,
  circle_id uuid references public.circles (id) on delete cascade,
  kind text not null check (kind in ('fire', 'strong', 'proud', 'clap', 'note')),
  note text check (char_length(note) <= 140),
  created_at timestamptz not null default now(),
  check (from_user <> to_user)
);
create index cheers_to_idx on public.cheers (to_user, created_at desc);
create index cheers_from_idx on public.cheers (from_user, created_at desc);
create index cheers_circle_idx on public.cheers (circle_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user" (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user" (id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) <= 1000),
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter text not null references "user" (id) on delete cascade,
  target_user text references "user" (id) on delete set null,
  circle_id uuid references public.circles (id) on delete set null,
  reason text not null check (char_length(reason) <= 60),
  details text check (char_length(details) <= 1000),
  created_at timestamptz not null default now()
);

-- Server-only key/value settings (e.g. generated Web Push keys).
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security: app_user may only READ its own social rows.
-- ---------------------------------------------------------------------------
alter table public.share_settings enable row level security;
alter table public.share_snapshots enable row level security;
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.invites enable row level security;
alter table public.friendships enable row level security;
alter table public.races enable row level security;
alter table public.race_participants enable row level security;
alter table public.cheers enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.reports enable row level security;
alter table public.app_settings enable row level security;

create policy "share_settings: own" on public.share_settings for select using (user_id = public.app_current_user());
create policy "share_snapshots: own" on public.share_snapshots for select using (user_id = public.app_current_user());
create policy "circle_members: own" on public.circle_members for select using (user_id = public.app_current_user());
create policy "invites: own" on public.invites for select using (created_by = public.app_current_user());
create policy "friendships: either party" on public.friendships for select
  using (user_low = public.app_current_user() or user_high = public.app_current_user());
create policy "race_participants: own" on public.race_participants for select using (user_id = public.app_current_user());
create policy "cheers: sender or recipient" on public.cheers for select
  using (from_user = public.app_current_user() or to_user = public.app_current_user());
create policy "notifications: own" on public.notifications for select using (user_id = public.app_current_user());
create policy "push_subscriptions: own" on public.push_subscriptions for select using (user_id = public.app_current_user());

grant select on public.share_settings, public.share_snapshots, public.circle_members, public.invites,
  public.friendships, public.race_participants, public.cheers, public.notifications, public.push_subscriptions
  to app_user;
