-- More Indian languages: Gujarati, Marathi, Bengali, Tamil, Telugu, Kannada.
do $$
declare c record;
begin
  for c in select conname from pg_constraint where conrelid = 'public.profiles'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%language%' loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
  end loop;
  for c in select conname from pg_constraint where conrelid = 'public.daily_cards'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%lang%' loop
    execute format('alter table public.daily_cards drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.profiles add constraint profiles_language_check
  check (language in ('en', 'hinglish', 'hi', 'gu', 'mr', 'bn', 'ta', 'te', 'kn'));
alter table public.daily_cards add constraint daily_cards_lang_check
  check (lang in ('en', 'hi', 'gu', 'mr', 'bn', 'ta', 'te', 'kn'));
