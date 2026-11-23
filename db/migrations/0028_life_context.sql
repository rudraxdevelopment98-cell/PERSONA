-- Life context: who the person is right now and which parts of life they want to grow in.
-- Stories, scenarios and labs draw situations from these areas instead of defaulting to office life.
alter table public.profiles
  add column if not exists life_stage text check (life_stage in ('student', 'working', 'business', 'home', 'seeking', 'other')),
  add column if not exists life_areas text[] not null default '{}';
