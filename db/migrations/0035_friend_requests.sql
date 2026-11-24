-- Friend requests: before discovery, friendships were only made through an
-- invite link (created as 'accepted'). Searching for someone needs a request
-- they can accept or decline, so add a 'pending' state and who sent it.
alter table public.friendships add column if not exists requested_by text references "user" (id) on delete cascade;

alter table public.friendships drop constraint if exists friendships_status_check;
alter table public.friendships add constraint friendships_status_check check (status in ('accepted', 'blocked', 'pending'));

-- blocked ⇒ blocked_by set; pending ⇒ requested_by set.
alter table public.friendships drop constraint if exists friendships_status_who;
alter table public.friendships add constraint friendships_status_who check (
  (status <> 'blocked' or blocked_by is not null) and
  (status <> 'pending' or requested_by is not null)
);

create index if not exists friendships_pending_idx on public.friendships (requested_by) where status = 'pending';
