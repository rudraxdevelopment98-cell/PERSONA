-- A user's own AI provider (their API key or OpenRouter account).
-- The key is encrypted by the application (AES-256-GCM) before it is stored;
-- the database never sees it in plain text.
create table if not exists public.ai_connections (
  user_id text primary key references "user" (id) on delete cascade,
  provider text not null check (provider in ('openrouter', 'anthropic', 'gemini', 'openai')),
  model text not null check (char_length(model) between 1 and 200),
  encrypted_key text not null,
  key_hint text not null check (char_length(key_hint) <= 16),
  connected_via text not null default 'key' check (connected_via in ('key', 'oauth')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_connections enable row level security;
create policy "ai_connections: own row select" on public.ai_connections for select using (user_id = public.app_current_user());
create policy "ai_connections: own row insert" on public.ai_connections for insert with check (user_id = public.app_current_user());
create policy "ai_connections: own row update" on public.ai_connections for update using (user_id = public.app_current_user()) with check (user_id = public.app_current_user());
create policy "ai_connections: own row delete" on public.ai_connections for delete using (user_id = public.app_current_user());
grant select, insert, update, delete on public.ai_connections to app_user;

create trigger ai_connections_updated_at before update on public.ai_connections
  for each row execute function public.set_updated_at();
