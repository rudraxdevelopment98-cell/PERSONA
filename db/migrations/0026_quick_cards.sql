-- Quick cards: one shared deck per day and language (generated once for everyone), and each person's answers.
create table if not exists public.daily_cards (
  card_date date not null,
  lang text not null check (lang in ('en', 'hi')),
  cards jsonb not null,
  source text not null default 'ai' check (source in ('ai', 'fallback')),
  created_at timestamptz not null default now(),
  primary key (card_date, lang)
);

create table if not exists public.card_answers (
  user_id text not null references "user" (id) on delete cascade,
  card_date date not null,
  idx smallint not null check (idx between 0 and 9),
  choice text not null check (choice in ('a', 'b')),
  correct boolean not null,
  created_at timestamptz not null default now(),
  primary key (user_id, card_date, idx)
);

alter table public.daily_cards enable row level security;
alter table public.card_answers enable row level security;
drop policy if exists "card_answers: own" on public.card_answers;
create policy "card_answers: own" on public.card_answers for select using (user_id = public.app_current_user());
grant select on public.card_answers to app_user;
