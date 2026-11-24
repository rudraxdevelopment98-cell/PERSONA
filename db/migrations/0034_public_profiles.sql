-- Public profiles + discovery (opt-in). A person chooses at sign-up whether their
-- profile is public (searchable, viewable by anyone) or private (friends only),
-- and exactly which parts are shown publicly. Changeable any time in Settings.
alter table public.profiles
  add column if not exists username text,
  add column if not exists profile_public boolean not null default false,
  -- What a stranger sees on a public profile. Name + avatar are always shown.
  add column if not exists public_items text[] not null default '{level,streak,badges}';

-- Case-insensitive unique handle. Handles are stored lowercased by the app.
create unique index if not exists profiles_username_key on public.profiles (lower(username)) where username is not null;
create index if not exists profiles_public_idx on public.profiles (profile_public) where profile_public;

-- A GIN index to search public profiles by name/handle prefix without a full scan.
create extension if not exists pg_trgm;
create index if not exists profiles_search_idx on public.profiles using gin (lower(coalesce(display_name, '') || ' ' || coalesce(username, '')) gin_trgm_ops) where profile_public;

-- app_user may read other people's public columns through the discovery queries,
-- which run as the owner role (like the existing social snapshot reads), so no
-- extra RLS policy is added here: a person still edits only their own row.
