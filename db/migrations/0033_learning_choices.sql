-- Opt-in choices: may the app turn coach chats / journal entries into private persona signals?
-- null = not asked yet (the app shows a one-time popup), true = yes, false = no.
alter table public.profiles add column if not exists learn_from_coach boolean;
alter table public.profiles add column if not exists learn_from_journal boolean;

-- Journal entries can become signals only with learn_from_journal = true. The journal text itself is never wiped.
alter table public.signal_events drop constraint if exists signal_events_source_check;
alter table public.signal_events add constraint signal_events_source_check
  check (source in ('checkin', 'reflection', 'challenge', 'story_line', 'scenario', 'decision', 'communication', 'coach', 'assessment', 'journal'));
