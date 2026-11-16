-- Interactive episodes: the first half ends at a choice point; the reader picks
-- what the protagonist does (and may give them a line), then the second half is
-- written from that choice.
alter table public.generated_stories
  add column if not exists brief text,
  add column if not exists choice jsonb,
  add column if not exists chosen text check (chosen is null or char_length(chosen) <= 4),
  add column if not exists user_line text check (user_line is null or char_length(user_line) <= 240),
  add column if not exists choice_feedback text,
  add column if not exists part2_at timestamptz;
