-- Communication Lab: record whether a reply was spoken, plus delivery metrics.
alter table public.exercise_completions
  add column if not exists input_mode text not null default 'text' check (input_mode in ('text', 'voice')),
  add column if not exists speech jsonb;
