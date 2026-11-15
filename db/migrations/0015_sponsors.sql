-- Sponsored cards (books, podcasts, courses, apps) shown to Free users.
create table if not exists public.sponsor_campaigns (
  id uuid primary key default gen_random_uuid(),
  sponsor_name text not null check (char_length(sponsor_name) between 2 and 80),
  category text not null check (category in ('book', 'podcast', 'course', 'app', 'event', 'other')),
  title text not null check (char_length(title) between 2 and 80),
  body text not null check (char_length(body) between 2 and 220),
  cta_label text not null default 'Learn more' check (char_length(cta_label) between 2 and 30),
  url text not null check (url ~ '^https://' and char_length(url) <= 400),
  placements text[] not null default '{dashboard,after_session,labs}',
  languages text[],           -- null = every language
  skills text[],              -- null = every skill
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  max_views int,              -- null = unlimited
  weight int not null default 1 check (weight between 1 and 10),
  active boolean not null default true,
  created_by text references "user" (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.sponsor_campaigns enable row level security;

-- Daily totals per placement (one row per campaign/day/placement).
create table if not exists public.sponsor_stats (
  campaign_id uuid not null references public.sponsor_campaigns (id) on delete cascade,
  day date not null,
  placement text not null,
  views int not null default 0,
  clicks int not null default 0,
  primary key (campaign_id, day, placement)
);
alter table public.sponsor_stats enable row level security;

-- One counted view per user per campaign per day.
create table if not exists public.sponsor_seen (
  campaign_id uuid not null references public.sponsor_campaigns (id) on delete cascade,
  user_id text not null references "user" (id) on delete cascade,
  day date not null,
  primary key (campaign_id, user_id, day)
);
alter table public.sponsor_seen enable row level security;

-- Promotion requests from the public "Advertise" page.
create table if not exists public.sponsor_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  email text not null check (char_length(email) <= 200),
  category text not null,
  link text check (char_length(link) <= 400),
  budget text check (char_length(budget) <= 60),
  message text check (char_length(message) <= 1500),
  status text not null default 'new' check (status in ('new', 'contacted', 'done', 'declined')),
  created_at timestamptz not null default now()
);
alter table public.sponsor_requests enable row level security;
