-- Hindi (Devanagari) users get their own quick-card deck; 'hi' stays the Hinglish deck.
alter table public.daily_cards drop constraint if exists daily_cards_lang_check;
alter table public.daily_cards add constraint daily_cards_lang_check check (lang in ('en', 'hi', 'gu', 'hindi'));
