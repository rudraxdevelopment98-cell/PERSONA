-- Consent records (DPDP Rules 2025 / Paddle / Play Store): what each person agreed to and when.
-- Withdrawing consent = deleting the account (Settings), which removes these rows too.
create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user" (id) on delete cascade,
  kind text not null check (kind in ('terms', 'privacy', 'age18')),
  version text not null check (char_length(version) <= 20),
  accepted_at timestamptz not null default now(),
  unique (user_id, kind, version)
);

alter table public.consents enable row level security;
drop policy if exists "consents: own" on public.consents;
create policy "consents: own" on public.consents for select using (user_id = public.app_current_user());
grant select on public.consents to app_user;
