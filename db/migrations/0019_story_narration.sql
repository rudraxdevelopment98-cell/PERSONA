-- A performance script for listening: Hinglish stories rewritten in Devanagari
-- with expressive punctuation, so Hindi voices read them naturally. Cached per body.
alter table public.generated_stories add column if not exists narration jsonb;
