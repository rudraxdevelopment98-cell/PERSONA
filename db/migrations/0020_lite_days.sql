-- Free plan: after the first week, 3 full episodes per rolling 7 days. Other days are
-- "lite days": the check-in still counts for the streak, but no story is generated.
alter table public.daily_checkins add column if not exists lite boolean not null default false;
