-- Backup password reset: two questions written by the user. Answers are
-- stored only as slow password hashes (scrypt via the auth library).
create table if not exists public.security_questions (
  user_id text primary key references "user" (id) on delete cascade,
  question_1 text not null check (char_length(question_1) between 5 and 200),
  answer_1_hash text not null,
  question_2 text not null check (char_length(question_2) between 5 and 200),
  answer_2_hash text not null,
  updated_at timestamptz not null default now()
);
alter table public.security_questions enable row level security;
create policy "security_questions: own row select" on public.security_questions for select using (user_id = public.app_current_user());
create policy "security_questions: own row insert" on public.security_questions for insert with check (user_id = public.app_current_user());
create policy "security_questions: own row update" on public.security_questions for update using (user_id = public.app_current_user()) with check (user_id = public.app_current_user());
create policy "security_questions: own row delete" on public.security_questions for delete using (user_id = public.app_current_user());
grant select, insert, update, delete on public.security_questions to app_user;

alter table public.password_reset_attempts add column if not exists method text not null default 'code';
