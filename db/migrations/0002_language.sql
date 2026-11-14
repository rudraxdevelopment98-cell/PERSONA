-- User-facing language for AI-generated content.
alter table public.profiles
  add column if not exists language text not null default 'en'
  check (language in ('en', 'hinglish', 'hi'));
