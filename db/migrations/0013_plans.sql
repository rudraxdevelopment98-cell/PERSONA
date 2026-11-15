-- Plans and payments. Server-only tables (no app_user access).
create table if not exists public.subscriptions (
  user_id text primary key references "user" (id) on delete cascade,
  plan text not null default 'pro' check (plan in ('pro')),
  status text not null check (status in ('active', 'trialing', 'past_due', 'paused', 'canceled')),
  source text not null check (source in ('paddle', 'trial', 'coupon', 'admin')),
  provider_customer_id text,
  provider_subscription_id text unique,
  billing_cycle text check (billing_cycle in ('month', 'year')),
  current_period_end timestamptz,
  cancel_at timestamptz,
  trial_used_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;

create table if not exists public.coupons (
  code text primary key check (code ~ '^[A-Z0-9-]{4,32}$'),
  days int not null check (days between 1 and 3650),
  max_uses int not null default 1 check (max_uses between 1 and 100000),
  uses int not null default 0,
  expires_at timestamptz,
  note text check (char_length(note) <= 200),
  created_by text references "user" (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.coupons enable row level security;

create table if not exists public.coupon_redemptions (
  code text not null references public.coupons (code) on delete cascade,
  user_id text not null references "user" (id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  primary key (code, user_id)
);
alter table public.coupon_redemptions enable row level security;

-- Webhook events, kept for idempotency and support.
create table if not exists public.payment_events (
  id text primary key,
  type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);
alter table public.payment_events enable row level security;
