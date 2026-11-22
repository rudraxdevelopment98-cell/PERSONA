-- "Aaj ka sawaal": one vote per person per local day.
create table if not exists public.poll_votes (
  user_id text not null references "user" (id) on delete cascade,
  poll_date date not null,
  poll_id text not null check (char_length(poll_id) <= 40),
  choice smallint not null check (choice between 0 and 2),
  created_at timestamptz not null default now(),
  primary key (user_id, poll_date)
);
create index if not exists poll_votes_day_idx on public.poll_votes (poll_date, poll_id);

alter table public.poll_votes enable row level security;
drop policy if exists "poll_votes: own" on public.poll_votes;
create policy "poll_votes: own" on public.poll_votes for select using (user_id = public.app_current_user());
grant select on public.poll_votes to app_user;
