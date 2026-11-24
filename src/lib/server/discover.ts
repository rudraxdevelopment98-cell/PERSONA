import "server-only";
import { getPool } from "@/lib/db/pool";
import { cleanPublicItems, cleanUsername, DEFAULT_PUBLIC_ITEMS, type PublicItem, usernameError } from "@/lib/domain/profile";
import { cleanAreas, LIFE_AREAS, type LifeArea } from "@/lib/domain/life";
import { DEFAULT_COVER } from "@/lib/domain/moments";

/**
 * Public profiles, user search and suggestions. Like social.ts, every function
 * runs as the owner connection and enforces access itself: a stranger only ever
 * sees a person's chosen public_items, and only when profile_public is true.
 */
const q = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await getPool().query(sql, params)).rows as T[];

export class DiscoverError extends Error {}

const BIO_MAX = 160;

export type Discovery = { username: string | null; isPublic: boolean; items: PublicItem[]; bio: string };

export async function getDiscovery(userId: string): Promise<Discovery> {
  const [p] = await q<{ username: string | null; profile_public: boolean; public_items: string[]; bio: string | null }>(
    "select username, profile_public, public_items, bio from public.profiles where id = $1",
    [userId],
  );
  return {
    username: p?.username ?? null,
    isPublic: Boolean(p?.profile_public),
    items: (p?.public_items as PublicItem[]) ?? DEFAULT_PUBLIC_ITEMS,
    bio: p?.bio ?? "",
  };
}

async function handleTaken(handle: string, exceptId: string): Promise<boolean> {
  const r = await q("select 1 from public.profiles where lower(username) = $1 and id <> $2", [handle, exceptId]);
  return r.length > 0;
}

/** Saves username, public/private and the shown items. Used by onboarding and Settings. */
export async function saveDiscovery(
  userId: string,
  input: { username?: unknown; isPublic?: unknown; items?: unknown; bio?: unknown },
): Promise<Discovery> {
  const current = await getDiscovery(userId);
  let username = current.username;

  if (input.username !== undefined) {
    const handle = cleanUsername(input.username);
    if (handle === "" && current.username) {
      // Keep the existing handle rather than clearing it.
    } else {
      const err = usernameError(handle);
      if (err) throw new DiscoverError(err);
      if (await handleTaken(handle, userId)) throw new DiscoverError("That username is taken. Try another.");
      username = handle;
    }
  }

  const isPublic = Boolean(input.isPublic);
  // A public profile needs a username so people can reach it.
  if (isPublic && !username) throw new DiscoverError("Pick a username to make your profile public.");

  const items = input.items !== undefined ? cleanPublicItems(input.items) : current.items;
  const bio = input.bio !== undefined ? String(input.bio).replace(/\s+/g, " ").trim().slice(0, BIO_MAX) : current.bio;

  await q("update public.profiles set username = $2, profile_public = $3, public_items = $4, bio = $5 where id = $1", [
    userId,
    username,
    isPublic,
    items,
    bio || null,
  ]);
  return { username, isPublic, items, bio };
}

export async function usernameAvailable(userId: string, raw: string): Promise<{ ok: boolean; error?: string }> {
  const handle = cleanUsername(raw);
  const err = usernameError(handle);
  if (err) return { ok: false, error: err };
  if (await handleTaken(handle, userId)) return { ok: false, error: "That username is taken. Try another." };
  return { ok: true };
}

export type PublicCard = {
  id: string;
  username: string;
  name: string;
  avatar_emoji: string | null;
  cover: string;
  isSelf: boolean;
  isFriend: boolean;
  isPublic: boolean;
  bio: string | null;
  level: number | null;
  level_name: string | null;
  xp: number | null;
  streak: number | null;
  best_streak: number | null;
  badges: { code: string; title: string; earned_at: string }[] | null;
  areas: { id: LifeArea; emoji: string; label: string }[] | null;
  scores: Record<string, number> | null;
};

const areaCards = (ids: LifeArea[]) =>
  LIFE_AREAS.filter((a) => ids.includes(a.id)).map((a) => ({ id: a.id, emoji: a.emoji, label: a.en }));

/** A profile as `viewerId` may see it, or null if it doesn't exist or is private to them. */
export async function publicProfile(viewerId: string | null, handle: string): Promise<PublicCard | null> {
  const h = cleanUsername(handle);
  if (!h) return null;
  const [p] = await q<{
    id: string;
    username: string;
    display_name: string | null;
    profile_public: boolean;
    public_items: string[];
    bio: string | null;
    avatar_emoji: string | null;
    cover: string | null;
    life_areas: string[];
  }>(
    "select id, username, display_name, profile_public, public_items, bio, avatar_emoji, cover, life_areas from public.profiles where lower(username) = $1",
    [h],
  );
  if (!p) return null;

  const isSelf = viewerId === p.id;
  let isFriend = false;
  let blocked = false;
  if (viewerId && !isSelf) {
    const [lo, hi] = viewerId < p.id ? [viewerId, p.id] : [p.id, viewerId];
    const [rel] = await q<{ status: string }>("select status from public.friendships where user_low = $1 and user_high = $2", [lo, hi]);
    isFriend = rel?.status === "accepted";
    blocked = rel?.status === "blocked";
  }
  if (blocked) return null;
  // Private profile is visible only to the owner and accepted friends.
  if (!p.profile_public && !isSelf && !isFriend) return null;

  // The owner and friends see everything; a stranger sees only the chosen items.
  const open = isSelf || isFriend;
  const items = new Set((p.public_items as PublicItem[]) ?? []);
  const show = (k: PublicItem) => open || items.has(k);

  const [snap] = await q<{
    level: number; level_name: string; xp: number; streak: number; best_streak: number;
    badges: { code: string; title: string; earned_at: string }[]; scores: Record<string, number>;
  }>("select level, level_name, xp, streak, best_streak, badges, scores from public.share_snapshots where user_id = $1", [p.id]);

  const areas = cleanAreas(p.life_areas) as LifeArea[];
  return {
    id: p.id,
    username: p.username,
    name: p.display_name?.trim() || "Member",
    avatar_emoji: p.avatar_emoji,
    cover: p.cover ?? DEFAULT_COVER,
    isSelf,
    isFriend,
    isPublic: p.profile_public,
    bio: show("bio") ? (p.bio ?? null) : null,
    level: show("level") ? (snap?.level ?? 1) : null,
    level_name: show("level") ? (snap?.level_name ?? null) : null,
    xp: show("level") ? (snap?.xp ?? 0) : null,
    streak: show("streak") ? (snap?.streak ?? 0) : null,
    best_streak: show("streak") ? (snap?.best_streak ?? 0) : null,
    badges: show("badges") ? (snap?.badges ?? []) : null,
    areas: show("areas") && areas.length ? areaCards(areas) : null,
    scores: show("scores") ? (snap?.scores ?? {}) : null,
  };
}

export type PersonResult = {
  id: string;
  username: string;
  name: string;
  avatar_emoji: string | null;
  cover: string;
  level: number;
  streak: number;
  isFriend: boolean;
  reason?: string;
};

const NOT_BLOCKED = `not exists (
  select 1 from public.friendships f
  where ((f.user_low = $1 and f.user_high = p.id) or (f.user_low = p.id and f.user_high = $1)) and f.status = 'blocked')`;
const IS_FRIEND = `exists (
  select 1 from public.friendships f
  where ((f.user_low = $1 and f.user_high = p.id) or (f.user_low = p.id and f.user_high = $1)) and f.status = 'accepted')`;

/** Search public profiles by username or display name. */
export async function searchUsers(viewerId: string, query: string, limit = 20): Promise<PersonResult[]> {
  const term = query.trim().toLowerCase().slice(0, 40);
  if (term.length < 2) return [];
  const like = `%${term.replace(/[%_\\]/g, (c) => "\\" + c)}%`;
  const rows = await q<PersonResult & { level: number; streak: number }>(
    `select p.id, p.username, coalesce(nullif(p.display_name, ''), 'Member') as name, p.avatar_emoji,
            coalesce(p.cover, $4) as cover, coalesce(s.level, 1) as level, coalesce(s.streak, 0) as streak,
            ${IS_FRIEND} as "isFriend"
       from public.profiles p left join public.share_snapshots s on s.user_id = p.id
      where p.profile_public and p.username is not null and p.id <> $1 and ${NOT_BLOCKED}
        and (lower(p.username) like $2 escape '\\' or lower(coalesce(p.display_name, '')) like $2 escape '\\')
      order by (lower(p.username) = $3) desc, s.level desc nulls last
      limit $5`,
    [viewerId, like, term, DEFAULT_COVER, limit],
  );
  return rows;
}

/**
 * "People you may know": public profiles who aren't already friends, ranked by
 * mutual friends, shared circles, shared life areas and the same app language.
 */
export async function suggestions(viewerId: string, limit = 10): Promise<PersonResult[]> {
  const rows = await q<PersonResult & { mutuals: number; circles: number; areas: number; lang: number }>(
    `with me as (select language, life_areas from public.profiles where id = $1)
     select p.id, p.username, coalesce(nullif(p.display_name, ''), 'Member') as name, p.avatar_emoji,
            coalesce(p.cover, $2) as cover, coalesce(s.level, 1) as level, coalesce(s.streak, 0) as streak, false as "isFriend",
            (select count(*) from public.friendships f1
               join public.friendships f2
                 on (case when f1.user_low = $1 then f1.user_high else f1.user_low end)
                  = (case when f2.user_low = p.id then f2.user_high else f2.user_low end)
              where (f1.user_low = $1 or f1.user_high = $1) and f1.status = 'accepted'
                and (f2.user_low = p.id or f2.user_high = p.id) and f2.status = 'accepted')::int as mutuals,
            (select count(*) from public.circle_members c1 join public.circle_members c2 on c1.circle_id = c2.circle_id
              where c1.user_id = $1 and c2.user_id = p.id)::int as circles,
            coalesce(cardinality(array(select unnest(p.life_areas) intersect select unnest((select life_areas from me)))), 0) as areas,
            (case when p.language is not distinct from (select language from me) then 1 else 0 end) as lang
       from public.profiles p left join public.share_snapshots s on s.user_id = p.id
      where p.profile_public and p.username is not null and p.id <> $1
        and not ${IS_FRIEND} and ${NOT_BLOCKED}
      order by mutuals desc, circles desc, areas desc, lang desc, s.level desc nulls last
      limit $3`,
    [viewerId, DEFAULT_COVER, limit],
  );
  return rows
    .filter((r) => r.mutuals + r.circles + r.areas + r.lang > 0)
    .map(({ mutuals, circles, areas, ...r }) => ({
      ...r,
      reason:
        mutuals > 0 ? `${mutuals} mutual friend${mutuals > 1 ? "s" : ""}` : circles > 0 ? "In a circle with you" : areas > 0 ? "Working on the same areas" : "Similar to you",
    }));
}
