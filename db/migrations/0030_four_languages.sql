-- The app now offers four languages: English, Hinglish, Hindi and Gujarati.
-- People on a removed language move to the closest one (Marathi -> Hindi, others -> English).
update public.profiles set language = 'hi' where language = 'mr';
update public.profiles set language = 'en' where language in ('bn', 'ta', 'te', 'kn');
delete from public.daily_cards where lang not in ('en', 'hi', 'gu');

alter table public.profiles drop constraint if exists profiles_language_check;
alter table public.profiles add constraint profiles_language_check check (language in ('en', 'hinglish', 'hi', 'gu'));
alter table public.daily_cards drop constraint if exists daily_cards_lang_check;
alter table public.daily_cards add constraint daily_cards_lang_check check (lang in ('en', 'hi', 'gu'));
