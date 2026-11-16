-- "Aaj ka moment": an optional free-text note (and quick tags) about what happened
-- today. It shapes only today's session; earlier days' notes are never re-sent.
alter table public.daily_checkins
  add column if not exists today_note text check (today_note is null or char_length(today_note) <= 2000),
  add column if not exists today_tags text[] not null default '{}',
  add column if not exists today_skipped boolean not null default false;
