-- Assessment length chosen by the user. Existing assessments used the full set.
alter table public.assessments
  add column if not exists depth text not null default 'deep' check (depth in ('quick', 'standard', 'deep'));
