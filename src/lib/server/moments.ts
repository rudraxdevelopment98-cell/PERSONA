import "server-only";
import { getPool } from "@/lib/db/pool";
import { todayIn } from "@/lib/domain/programme";
import {
  BIO_MAX,
  CAPTION_MAX,
  DEFAULT_COVER,
  MAX_PINNED,
  MOMENT_ITEM,
  MOMENT_KINDS,
  duoStreak,
  isAvatarEmoji,
  isCover,
  type MomentData,
  type MomentKind,
  type ReactionId,
  REACTIONS,
} from "@/lib/domain/moments";
import { ACHIEVEMENTS } from "./gamification";
import { showUpDates } from "./streaks";
import { SocialError, itemsVisibleTo, loadSnapshots, notify, refreshSnapshot, refreshSnapshotSafe } from "./social";

/**
 * Moments: 24-hour progress cards friends can tap through, plus friend streaks and
 * the profile card. A moment's numbers always come from the server, never from the client.
 */

const q = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await getPool().query(sql, params)).rows as T[];

const MAX_ACTIVE = 10;
const MAX_PER_DAY = 15;

export const badgeIcon = (code: string) => ACHIEVEMENTS.find((a) => a.code === code)?.icon ?? "trophy";

// ---------------------------------------------------------------------------
// Profile card
// ---------------------------------------------------------------------------

export type ProfileCard = { avatar_emoji: string | null; cover: string; bio: string; pinned: string[] };

export async function getProfileCard(userId: string): Promise<ProfileCard> {
  const [p] = await q<{ avatar_emoji: string | null; cover: string | null; bio: string | null; pinned_badges: string[] }>(
    "select avatar_emoji, cover, bio, pinned_badges from public.profiles where id = $1",
    [userId],
  );
  return { avatar_emoji: p?.avatar_emoji ?? null, cover: p?.cover ?? DEFAULT_COVER, bio: p?.bio ?? "", pinned: p?.pinned_badges ?? [] };
}

export async function saveProfileCard(userId: string, input: { avatar_emoji?: unknown; cover?: unknown; bio?: unknown; pinned?: unknown }) {
  const avatar = input.avatar_emoji === null || input.avatar_emoji === "" ? null : isAvatarEmoji(input.avatar_emoji) ? input.avatar_emoji : undefined;
  if (avatar === undefined) throw new SocialError("Pick an avatar from the list.");
  if (!isCover(input.cover)) throw new SocialError("Pick a cover from the list.");
  const bio = typeof input.bio === "string" ? input.bio.replace(/\s+/g, " ").trim().slice(0, BIO_MAX) : "";
  const earned = new Set((await q<{ code: string }>("select code from public.achievements where user_id = $1", [userId])).map((r) => r.code));
  const pinned = Array.isArray(input.pinned) ? [...new Set(input.pinned.filter((c): c is string => typeof c === "string" && earned.has(c)))].slice(0, MAX_PINNED) : [];
  await q("update public.profiles set avatar_emoji = $2, cover = $3, bio = $4, pinned_badges = $5 where id = $1", [userId, avatar, input.cover, bio || null, pinned]);
  await refreshSnapshotSafe(userId);
}

// ---------------------------------------------------------------------------
// Composing
// ---------------------------------------------------------------------------

export type MomentOption = { kind: MomentKind; data: MomentData; hiddenFromFriends: boolean };

/** The moments this user can post right now, built from their real progress. */
export async function momentOptions(userId: string): Promise<MomentOption[]> {
  await refreshSnapshot(userId);
  const snap = (await loadSnapshots([userId])).get(userId);
  if (!snap) return [];
  const today = todayIn(snap.timezone);
  const [doneToday] = await q<{ n: number }>(
    "select count(*)::int as n from public.daily_sessions where user_id = $1 and session_date = $2 and completed_at is not null",
    [userId, today],
  );
  const [setting] = await q<{ items: string[] }>("select items from public.share_settings where user_id = $1 and circle_id is null", [userId]);
  const shared = new Set(setting?.items ?? ["activity", "xp", "badges"]);
  const out: Omit<MomentOption, "hiddenFromFriends">[] = [];
  if (doneToday.n > 0) out.push({ kind: "day", data: { day: snap.programme_day, sessions: snap.sessions_completed } });
  if (snap.streak >= 2) out.push({ kind: "streak", data: { streak: snap.streak } });
  const recent = snap.badges.find((b) => Date.now() - Date.parse(b.earned_at) < 7 * 86_400_000);
  if (recent) out.push({ kind: "badge", data: { badge: recent.title, icon: badgeIcon(recent.code) } });
  if (snap.level >= 2) out.push({ kind: "level", data: { level: snap.level, levelName: snap.level_name } });
  if (snap.challenges_completed > 0) out.push({ kind: "challenge", data: { challenges: snap.challenges_completed } });
  const best = Object.entries(snap.growth ?? {}).sort((a, b) => b[1] - a[1])[0];
  if (best && best[1] > 0) out.push({ kind: "growth", data: { dimension: best[0], delta: Math.round(best[1]) } });
  if (snap.programme_day > 0) out.push({ kind: "progress", data: { day: snap.programme_day, pct: Math.round((Math.min(90, snap.programme_day) / 90) * 100) } });
  return out.map((o) => ({ ...o, hiddenFromFriends: !shared.has(MOMENT_ITEM[o.kind]) }));
}

export async function postMoment(userId: string, input: { kind: unknown; cover: unknown; caption?: unknown }) {
  if (!MOMENT_KINDS.includes(input.kind as MomentKind)) throw new SocialError("Pick a moment to share.");
  const cover = isCover(input.cover) ? input.cover : DEFAULT_COVER;
  const caption = typeof input.caption === "string" ? input.caption.replace(/\s+/g, " ").trim().slice(0, CAPTION_MAX) || null : null;
  const option = (await momentOptions(userId)).find((o) => o.kind === input.kind);
  if (!option) throw new SocialError("That moment isn't available right now.");
  await q("delete from public.moments where user_id = $1 and expires_at < now() - interval '1 day'", [userId]);
  const [lim] = await q<{ active: number; today: number }>(
    `select count(*) filter (where expires_at > now())::int as active, count(*) filter (where created_at > now() - interval '1 day')::int as today
       from public.moments where user_id = $1`,
    [userId],
  );
  if (lim.active >= MAX_ACTIVE || lim.today >= MAX_PER_DAY) throw new SocialError("You've shared a lot today! Try again tomorrow.", 429);
  // Re-posting the same kind replaces the earlier one, so friends don't tap through duplicates.
  await q("delete from public.moments where user_id = $1 and kind = $2 and expires_at > now()", [userId, option.kind]);
  const [m] = await q<{ id: string }>("insert into public.moments (user_id, kind, data, cover, caption) values ($1, $2, $3, $4, $5) returning id", [
    userId,
    option.kind,
    JSON.stringify(option.data),
    cover,
    caption,
  ]);
  return m.id;
}

export async function deleteMoment(userId: string, id: string) {
  await q("delete from public.moments where id = $1 and user_id = $2", [id, userId]);
}

// ---------------------------------------------------------------------------
// Feed
// ---------------------------------------------------------------------------

export type FeedMoment = {
  id: string;
  kind: MomentKind;
  data: MomentData;
  cover: string;
  caption: string | null;
  created_at: string;
  seen: boolean;
  myReaction: string | null;
  views?: number;
};
export type FeedPerson = { id: string; name: string; avatar_emoji: string | null; cover: string | null; isMe: boolean; moments: FeedMoment[]; allSeen: boolean };

/** Active moments the viewer may see, grouped by person: me first, then unseen, then seen. */
export async function momentFeed(viewer: string, opts: { circleId?: string; userId?: string } = {}): Promise<FeedPerson[]> {
  let owners: string[];
  if (opts.userId) owners = [opts.userId];
  else if (opts.circleId) owners = (await q<{ user_id: string }>("select user_id from public.circle_members where circle_id = $1", [opts.circleId])).map((r) => r.user_id);
  else
    owners = (
      await q<{ id: string }>(
        `select case when user_low = $1 then user_high else user_low end as id from public.friendships where (user_low = $1 or user_high = $1) and status = 'accepted'
         union select b.user_id from public.circle_members a join public.circle_members b on b.circle_id = a.circle_id where a.user_id = $1
         union select $1::text`,
        [viewer],
      )
    ).map((r) => r.id);
  if (opts.circleId && !owners.includes(viewer)) throw new SocialError("You're not a member of this circle.", 403);
  const rows = await q<{
    id: string;
    user_id: string;
    kind: MomentKind;
    data: MomentData;
    cover: string;
    caption: string | null;
    created_at: string;
    seen: boolean;
    reaction: string | null;
    views: number;
  }>(
    `select m.id, m.user_id, m.kind, m.data, m.cover, m.caption, m.created_at,
            (v.viewer is not null) as seen, v.reaction,
            (select count(*)::int from public.moment_views x where x.moment_id = m.id) as views
       from public.moments m left join public.moment_views v on v.moment_id = m.id and v.viewer = $1
      where m.user_id = any($2) and m.expires_at > now() order by m.created_at`,
    [viewer, owners],
  );
  if (rows.length === 0) return [];
  const people = [...new Set(rows.map((r) => r.user_id))];
  const access = await itemsVisibleTo(viewer, people, opts.circleId);
  const snaps = await loadSnapshots(people);
  const out: FeedPerson[] = [];
  for (const id of people) {
    const isMe = id === viewer;
    const items = isMe ? null : access.get(id);
    if (!isMe && !items) continue;
    const moments = rows
      .filter((r) => r.user_id === id && (isMe || items!.includes(MOMENT_ITEM[r.kind])))
      .map((r) => ({
        id: r.id,
        kind: r.kind,
        data: r.data,
        cover: r.cover,
        caption: r.caption,
        created_at: new Date(r.created_at).toISOString(),
        seen: isMe || r.seen,
        myReaction: r.reaction,
        ...(isMe ? { views: r.views } : {}),
      }));
    if (moments.length === 0) continue;
    const s = snaps.get(id);
    out.push({ id, name: isMe ? "You" : (s?.display_name ?? "Member"), avatar_emoji: s?.avatar_emoji ?? null, cover: s?.cover ?? null, isMe, moments, allSeen: moments.every((m) => m.seen) });
  }
  return out.sort((a, b) => Number(b.isMe) - Number(a.isMe) || Number(a.allSeen) - Number(b.allSeen));
}

async function canSee(viewer: string, momentId: string) {
  const [m] = await q<{ user_id: string; kind: MomentKind }>("select user_id, kind from public.moments where id = $1 and expires_at > now()", [momentId]);
  if (!m) throw new SocialError("This moment has expired.", 404);
  if (m.user_id === viewer) return m;
  const items = (await itemsVisibleTo(viewer, [m.user_id])).get(m.user_id);
  if (!items?.includes(MOMENT_ITEM[m.kind])) throw new SocialError("This moment isn't shared with you.", 403);
  return m;
}

/** Marks a moment seen, optionally with a reaction (the owner gets one notification per reaction). */
export async function viewMoment(viewer: string, momentId: string, reaction?: string | null) {
  const m = await canSee(viewer, momentId);
  if (m.user_id === viewer) return;
  const r = reaction && REACTIONS.some((x) => x.id === reaction) ? (reaction as ReactionId) : null;
  const [prev] = await q<{ reaction: string | null }>("select reaction from public.moment_views where moment_id = $1 and viewer = $2", [momentId, viewer]);
  await q(
    `insert into public.moment_views (moment_id, viewer, reaction) values ($1, $2, $3)
     on conflict (moment_id, viewer) do update set reaction = coalesce(excluded.reaction, public.moment_views.reaction)`,
    [momentId, viewer, r],
  );
  if (r && prev?.reaction !== r) {
    const [{ name }] = await q<{ name: string }>("select coalesce(nullif(display_name, ''), 'Someone') as name from public.profiles where id = $1", [viewer]);
    const emoji = REACTIONS.find((x) => x.id === r)!.emoji;
    await notify(m.user_id, "moment_reaction", { title: `${emoji} ${name} reacted to your moment`, body: "Tap to see who else viewed it.", url: "/friends" });
  }
}

/** Who saw my moment (only the owner can ask). */
export async function momentViewers(owner: string, momentId: string) {
  const [m] = await q("select 1 from public.moments where id = $1 and user_id = $2", [momentId, owner]);
  if (!m) throw new SocialError("Not your moment.", 403);
  return q<{ id: string; name: string; avatar_emoji: string | null; reaction: string | null; viewed_at: string }>(
    `select v.viewer as id, coalesce(nullif(p.display_name, ''), 'Member') as name, p.avatar_emoji, v.reaction, v.viewed_at
       from public.moment_views v join public.profiles p on p.id = v.viewer
      where v.moment_id = $1 and not exists (select 1 from public.friendships f where f.status = 'blocked'
        and f.user_low = least($2, v.viewer) and f.user_high = greatest($2, v.viewer))
      order by v.viewed_at desc`,
    [momentId, owner],
  );
}

// ---------------------------------------------------------------------------
// Friend streaks and "done today"
// ---------------------------------------------------------------------------

export type Duo = { streak: number; todayMe: boolean; todayThem: boolean };

/** Friend streaks between the user and each friend. */
export async function duoStreaks(userId: string, friendIds: string[]): Promise<Map<string, Duo>> {
  if (friendIds.length === 0) return new Map();
  const [p] = await q<{ timezone: string }>("select timezone from public.profiles where id = $1", [userId]);
  const today = todayIn(p?.timezone ?? "UTC");
  const dates = await showUpDates([userId, ...friendIds]);
  const mine = dates.get(userId) ?? [];
  return new Map(friendIds.map((f) => [f, duoStreak(mine, dates.get(f) ?? [], today)]));
}

/** Whether each person has shown up today in their own time zone. */
export async function doneToday(ids: string[]): Promise<Map<string, boolean>> {
  if (ids.length === 0) return new Map();
  const rows = await q<{ id: string; done: boolean }>(
    `select p.id, (
        exists (select 1 from public.daily_checkins c where c.user_id = p.id and c.completed_at is not null and c.checkin_date = (now() at time zone p.timezone)::date)
        or exists (select 1 from public.daily_sessions s where s.user_id = p.id and s.completed_at is not null and s.session_date = (now() at time zone p.timezone)::date)
      ) as done
       from public.profiles p where p.id = any($1)`,
    [ids],
  );
  return new Map(rows.map((r) => [r.id, r.done]));
}
