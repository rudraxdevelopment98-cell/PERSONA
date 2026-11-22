-- Error monitoring: errors grouped per hour by a fingerprint (where + message), so storage stays small.
-- No user content is stored: only the route or page path, a short error message and a count.
create table if not exists public.app_errors (
  fingerprint text not null,
  bucket timestamptz not null,           -- the hour
  source text not null check (source in ('server', 'client', 'ai')),
  location text not null,
  message text not null,
  count int not null default 1,
  users int not null default 0,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (fingerprint, bucket)
);
create index if not exists app_errors_bucket_idx on public.app_errors (bucket desc);
alter table public.app_errors enable row level security;
