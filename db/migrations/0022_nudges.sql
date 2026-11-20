-- Friend-streak nudges: automatic evening reminders and manual "nudge" taps, at most one of each
-- kind per pair per day.
create table if not exists public.nudges (
  id uuid primary key default gen_random_uuid(),
  from_user text references "user" (id) on delete cascade,   -- null = sent automatically
  to_user text not null references "user" (id) on delete cascade,
  about_user text not null references "user" (id) on delete cascade,  -- the streak partner
  kind text not null check (kind in ('auto', 'manual')),
  nudge_date date not null,
  created_at timestamptz not null default now(),
  unique (to_user, about_user, kind, nudge_date)
);
create index if not exists nudges_from_idx on public.nudges (from_user, created_at desc);

alter table public.nudges enable row level security;
drop policy if exists "nudges: own" on public.nudges;
create policy "nudges: own" on public.nudges for select
  using (to_user = public.app_current_user() or from_user = public.app_current_user());
grant select on public.nudges to app_user;
