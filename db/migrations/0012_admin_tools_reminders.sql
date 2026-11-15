-- Daily reminders: at most one per user per day.
alter table public.profiles add column if not exists last_reminder_date date;
alter table public.profiles add column if not exists reminders_enabled boolean not null default true;

-- Every admin action is recorded.
create table if not exists public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  admin_id text references "user" (id) on delete set null,
  action text not null check (char_length(action) <= 60),
  target_user text references "user" (id) on delete set null,
  target_label text check (char_length(target_label) <= 200),
  detail text check (char_length(detail) <= 1000),
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_created_idx on public.admin_audit (created_at desc);
alter table public.admin_audit enable row level security;

-- Announcements sent by admins.
create table if not exists public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  admin_id text references "user" (id) on delete set null,
  title text not null check (char_length(title) between 2 and 80),
  body text not null check (char_length(body) between 2 and 300),
  url text check (char_length(url) <= 200),
  audience text not null check (audience in ('all', 'active', 'inactive')),
  recipients int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.broadcasts enable row level security;
