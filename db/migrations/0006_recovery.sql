-- One-time recovery codes for resetting a forgotten password without email.
-- Only SHA-256 hashes are stored.
create table if not exists public.recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user" (id) on delete cascade,
  code_hash text not null unique,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists recovery_codes_user_idx on public.recovery_codes (user_id);

alter table public.recovery_codes enable row level security;
create policy "recovery_codes: own rows select" on public.recovery_codes for select using (user_id = public.app_current_user());
create policy "recovery_codes: own rows insert" on public.recovery_codes for insert with check (user_id = public.app_current_user());
create policy "recovery_codes: own rows delete" on public.recovery_codes for delete using (user_id = public.app_current_user());
grant select, insert, delete on public.recovery_codes to app_user;

-- Failed/used reset attempts, for rate limiting (server-only; no app_user access).
create table if not exists public.password_reset_attempts (
  id uuid primary key default gen_random_uuid(),
  email_hash text not null,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists password_reset_attempts_email_idx on public.password_reset_attempts (email_hash, created_at);
create index if not exists password_reset_attempts_ip_idx on public.password_reset_attempts (ip_hash, created_at);
alter table public.password_reset_attempts enable row level security;
