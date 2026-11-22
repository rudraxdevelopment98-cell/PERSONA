-- Referrals: when someone joins through a friend's invite and finishes their first episode,
-- both get 7 days of Pro (once per new person).
create table if not exists public.referrals (
  invitee text primary key references "user" (id) on delete cascade,
  inviter text not null references "user" (id) on delete cascade,
  created_at timestamptz not null default now(),
  rewarded_at timestamptz
);
create index if not exists referrals_inviter_idx on public.referrals (inviter, rewarded_at);

alter table public.referrals enable row level security;
drop policy if exists "referrals: either side" on public.referrals;
create policy "referrals: either side" on public.referrals for select
  using (invitee = public.app_current_user() or inviter = public.app_current_user());
grant select on public.referrals to app_user;

-- New Pro source for these grants.
alter table public.subscriptions drop constraint if exists subscriptions_source_check;
alter table public.subscriptions add constraint subscriptions_source_check check (source in ('paddle', 'trial', 'coupon', 'admin', 'referral'));
