import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { getPool } from "@/lib/db/pool";
import { dbForUser } from "@/lib/db/server";
import type { Dimension } from "@/lib/domain/dimensions";
import { levelInfo } from "@/lib/domain/gamification";
import { focusForDay, phaseForDay, programmeDay, todayIn } from "@/lib/domain/programme";
import {
  DEFAULT_SHARE,
  RACE_KINDS,
  filterSnapshot,
  rankScores,
  raceScore,
  sanitiseItems,
  type RaceEvents,
  type RaceKind,
  type SharedView,
  type ShareItem,
  type Snapshot,
} from "@/lib/domain/social";
import { loadStats } from "./gamification";
import { sendPush } from "./push";

/**
 * Social features. Everything here runs with the owner connection, so every
 * function checks access explicitly. Other people's data is only ever read
 * from share_snapshots (filtered by sharing settings) or as activity counts.
 */

const pool = () => getPool();
const q = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await pool().query(sql, params)).rows as T[];

export class SocialError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

const pair = (a: string, b: string) => (a < b ? [a, b] : [b, a]);
const hashToken = (t: string) => createHash("sha256").update(`persona90-invite:${t}`).digest("hex");

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

/** Recomputes the shareable summary for a user (numbers, badges, relative growth only). */
export async function refreshSnapshot(userId: string) {
  const [profile] = await q<{ display_name: string | null; timezone: string; programme_start_date: string | null }>(
    "select display_name, timezone, programme_start_date::text from public.profiles where id = $1",
    [userId],
  );
  if (!profile) return;
  const today = todayIn(profile.timezone);
  const day = programmeDay(profile.programme_start_date, today);
  const stats = await loadStats(dbForUser(userId), userId, Math.max(1, day));
  const level = levelInfo(stats.xp);
  const [last] = await q<{ d: string | null }>(
    "select max(session_date)::text as d from public.daily_sessions where user_id = $1 and completed_at is not null",
    [userId],
  );
  const badges = await q<{ code: string; title: string; earned_at: string }>(
    "select code, title, earned_at from public.achievements where user_id = $1 order by earned_at desc limit 50",
    [userId],
  );
  const skills = await q<{ dimension: Dimension; baseline: number; current: number }>(
    "select dimension, baseline::float8 as baseline, current::float8 as current from public.skill_progress where user_id = $1",
    [userId],
  );
  const growth: Record<string, number> = {};
  const scores: Record<string, number> = {};
  for (const s of skills) {
    growth[s.dimension] = Math.round((s.current - s.baseline) * 10) / 10;
    scores[s.dimension] = Math.round(s.current);
  }
  const weakest = [...skills].sort((a, b) => a.current - b.current).slice(0, 3).map((s) => s.dimension);
  const focus = day > 0 ? focusForDay(day, weakest) : null;

  await q(
    `insert into public.share_snapshots (user_id, display_name, timezone, programme_day, phase, sessions_completed, streak, best_streak,
       last_active_date, xp, level, level_name, challenges_completed, badges, growth, scores, focus, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17, now())
     on conflict (user_id) do update set display_name = excluded.display_name, timezone = excluded.timezone,
       programme_day = excluded.programme_day, phase = excluded.phase, sessions_completed = excluded.sessions_completed,
       streak = excluded.streak, best_streak = excluded.best_streak, last_active_date = excluded.last_active_date,
       xp = excluded.xp, level = excluded.level, level_name = excluded.level_name,
       challenges_completed = excluded.challenges_completed, badges = excluded.badges, growth = excluded.growth,
       scores = excluded.scores, focus = excluded.focus, updated_at = now()`,
    [
      userId,
      (profile.display_name || "").trim() || "Member",
      profile.timezone,
      day,
      day > 0 ? phaseForDay(day).number : null,
      stats.sessionsCompleted,
      stats.streak,
      stats.bestStreak,
      last?.d ?? null,
      stats.xp,
      level.level,
      level.name,
      stats.challenges,
      JSON.stringify(badges),
      JSON.stringify(growth),
      JSON.stringify(scores),
      focus ? JSON.stringify({ title: focus.title, dimension: focus.dimension }) : null,
    ],
  );
}

/** Re-checks badges (incl. social ones); also refreshes the snapshot. */
export async function awardSocial(userId: string) {
  try {
    const { awardAchievements } = await import("./gamification");
    const [p] = await q<{ timezone: string; programme_start_date: string | null }>("select timezone, programme_start_date::text from public.profiles where id = $1", [userId]);
    const day = p ? Math.max(1, programmeDay(p.programme_start_date, todayIn(p.timezone))) : 1;
    await awardAchievements(dbForUser(userId), userId, day);
  } catch (err) {
    console.warn("[social] badge check failed", (err as Error).message);
  }
}

/** Refresh, but never let a social failure break the user's main action. */
export async function refreshSnapshotSafe(userId: string) {
  try {
    await refreshSnapshot(userId);
  } catch (err) {
    console.warn("[social] snapshot refresh failed", (err as Error).message);
  }
}

async function loadSnapshots(ids: string[]): Promise<Map<string, Snapshot>> {
  if (ids.length === 0) return new Map();
  let rows = await q<Snapshot>("select *, last_active_date::text as last_active_date from public.share_snapshots where user_id = any($1)", [ids]);
  const missing = ids.filter((id) => !rows.some((r) => r.user_id === id));
  if (missing.length) {
    await Promise.all(missing.map(refreshSnapshotSafe));
    rows = await q<Snapshot>("select *, last_active_date::text as last_active_date from public.share_snapshots where user_id = any($1)", [ids]);
  }
  return new Map(rows.map((r) => [r.user_id, r]));
}

// ---------------------------------------------------------------------------
// Sharing settings and access
// ---------------------------------------------------------------------------

export async function getSharing(userId: string) {
  const rows = await q<{ circle_id: string | null; items: string[] }>("select circle_id, items from public.share_settings where user_id = $1", [userId]);
  const [p] = await q<{ social_paused: boolean }>("select social_paused from public.profiles where id = $1", [userId]);
  const friends = rows.find((r) => r.circle_id === null);
  return {
    friends: friends ? sanitiseItems(friends.items) : [...DEFAULT_SHARE],
    circles: Object.fromEntries(rows.filter((r) => r.circle_id).map((r) => [r.circle_id!, sanitiseItems(r.items)])) as Record<string, ShareItem[]>,
    paused: Boolean(p?.social_paused),
  };
}

export async function setSharing(userId: string, circleId: string | null, items: ShareItem[] | null) {
  if (circleId) await assertMember(userId, circleId);
  if (items === null) {
    if (circleId) await q("delete from public.share_settings where user_id = $1 and circle_id = $2", [userId, circleId]);
    return;
  }
  const clean = sanitiseItems(items);
  await q(
    `insert into public.share_settings (user_id, circle_id, items) values ($1, $2, $3)
     on conflict (user_id, coalesce(circle_id, '00000000-0000-0000-0000-000000000000'::uuid)) do update set items = excluded.items, updated_at = now()`,
    [userId, circleId, clean],
  );
}

export async function setPaused(userId: string, paused: boolean) {
  await q("update public.profiles set social_paused = $2 where id = $1", [userId, paused]);
}

async function isBlocked(a: string, b: string) {
  const [lo, hi] = pair(a, b);
  const r = await q("select 1 from public.friendships where user_low = $1 and user_high = $2 and status = 'blocked'", [lo, hi]);
  return r.length > 0;
}

async function areFriends(a: string, b: string) {
  const [lo, hi] = pair(a, b);
  const r = await q("select 1 from public.friendships where user_low = $1 and user_high = $2 and status = 'accepted'", [lo, hi]);
  return r.length > 0;
}

/**
 * What `target` shares with `viewer` (union of the friend setting and any
 * shared circles' settings), or null when the viewer may see nothing.
 */
export async function itemsVisibleTo(viewer: string, targets: string[], circleId?: string): Promise<Map<string, ShareItem[]>> {
  const out = new Map<string, ShareItem[]>();
  const others = targets.filter((t) => t !== viewer);
  if (others.length === 0) return out;
  const rows = await q<{ target: string; paused: boolean; blocked: boolean; friend: boolean; circles: string[] | null }>(
    `select t.id as target,
            p.social_paused as paused,
            exists (select 1 from public.friendships f where f.user_low = least($1, t.id) and f.user_high = greatest($1, t.id) and f.status = 'blocked') as blocked,
            exists (select 1 from public.friendships f where f.user_low = least($1, t.id) and f.user_high = greatest($1, t.id) and f.status = 'accepted') as friend,
            (select array_agg(a.circle_id) from public.circle_members a join public.circle_members b on b.circle_id = a.circle_id and b.user_id = $1
              where a.user_id = t.id ${circleId ? "and a.circle_id = $3" : ""}) as circles
       from unnest($2::text[]) as t(id) join public.profiles p on p.id = t.id`,
    circleId ? [viewer, others, circleId] : [viewer, others],
  );
  const settings = await q<{ user_id: string; circle_id: string | null; items: string[] }>(
    "select user_id, circle_id, items from public.share_settings where user_id = any($1)",
    [others],
  );
  for (const r of rows) {
    if (r.paused || r.blocked) continue;
    const mine = settings.filter((s) => s.user_id === r.target);
    const friendItems = sanitiseItems(mine.find((s) => s.circle_id === null)?.items ?? DEFAULT_SHARE);
    const set = new Set<ShareItem>();
    if (r.friend && !circleId) friendItems.forEach((i) => set.add(i));
    for (const c of r.circles ?? []) {
      const override = mine.find((s) => s.circle_id === c);
      (override ? sanitiseItems(override.items) : friendItems).forEach((i) => set.add(i));
    }
    if (r.friend || (r.circles?.length ?? 0) > 0) out.set(r.target, [...set]);
  }
  return out;
}

/** Shared views for the given people, as seen by the viewer. Users with no access are omitted. */
export async function sharedViews(viewer: string, ids: string[], circleId?: string): Promise<Map<string, SharedView>> {
  const access = await itemsVisibleTo(viewer, ids, circleId);
  const snaps = await loadSnapshots([...access.keys()]);
  const out = new Map<string, SharedView>();
  for (const [id, items] of access) {
    const s = snaps.get(id);
    if (s) out.set(id, filterSnapshot(s, items, todayIn(s.timezone)));
  }
  return out;
}

export type WeekStats = { sessions: number; checkins: number; challenges: number };

/** Activity counts for the last 7 days (numbers only). */
export async function weekStats(ids: string[]): Promise<Map<string, WeekStats>> {
  if (ids.length === 0) return new Map();
  const rows = await q<{ id: string; sessions: number; checkins: number; challenges: number }>(
    `select u.id,
       (select count(*)::int from public.daily_sessions s where s.user_id = u.id and s.completed_at > now() - interval '7 days') as sessions,
       (select count(*)::int from public.daily_checkins c where c.user_id = u.id and c.completed_at > now() - interval '7 days') as checkins,
       (select count(*)::int from public.daily_sessions s where s.user_id = u.id and s.challenge_status = 'completed' and s.challenge_updated_at > now() - interval '7 days') as challenges
     from unnest($1::text[]) as u(id)`,
    [ids],
  );
  return new Map(rows.map((r) => [r.id, { sessions: r.sessions, checkins: r.checkins, challenges: r.challenges }]));
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function notify(userId: string, type: string, payload: { title: string; body: string; url: string } & Record<string, unknown>) {
  await q("insert into public.notifications (user_id, type, payload) values ($1, $2, $3)", [userId, type, JSON.stringify(payload)]);
  await sendPush(userId, { title: payload.title, body: payload.body, url: payload.url });
}

export async function unreadCount(userId: string): Promise<number> {
  const [r] = await q<{ n: number }>("select count(*)::int as n from public.notifications where user_id = $1 and read_at is null", [userId]);
  return r?.n ?? 0;
}

export async function listNotifications(userId: string) {
  return q<{ id: string; type: string; payload: { title: string; body: string; url: string }; created_at: string; read_at: string | null }>(
    "select id, type, payload, created_at, read_at from public.notifications where user_id = $1 order by created_at desc limit 60",
    [userId],
  );
}

export async function markAllRead(userId: string) {
  await q("update public.notifications set read_at = now() where user_id = $1 and read_at is null", [userId]);
}

async function nameOf(userId: string) {
  const [p] = await q<{ display_name: string | null }>("select display_name from public.profiles where id = $1", [userId]);
  return (p?.display_name || "").trim() || "A friend";
}

// ---------------------------------------------------------------------------
// Invites and friendships
// ---------------------------------------------------------------------------

export async function createInvite(userId: string, kind: "friend" | "circle", circleId: string | null, maxUses = 5, days = 7) {
  if (kind === "circle") await assertMember(userId, circleId!);
  const [{ n }] = await q<{ n: number }>("select count(*)::int as n from public.invites where created_by = $1 and created_at > now() - interval '1 day'", [userId]);
  if (n >= 20) throw new SocialError("You've created a lot of invites today. Try again tomorrow.", 429);
  const token = randomBytes(18).toString("base64url");
  await q(
    "insert into public.invites (token_hash, created_by, kind, circle_id, max_uses, expires_at) values ($1, $2, $3, $4, $5, now() + make_interval(days => $6))",
    [hashToken(token), userId, kind, kind === "circle" ? circleId : null, Math.min(50, Math.max(1, maxUses)), Math.min(30, Math.max(1, days))],
  );
  return token;
}

export async function listInvites(userId: string) {
  return q<{ id: string; kind: string; circle_id: string | null; uses: number; max_uses: number; expires_at: string; revoked_at: string | null }>(
    "select id, kind, circle_id, uses, max_uses, expires_at, revoked_at from public.invites where created_by = $1 and revoked_at is null and expires_at > now() order by created_at desc limit 20",
    [userId],
  );
}

export async function revokeInvite(userId: string, inviteId: string) {
  await q("update public.invites set revoked_at = now() where id = $1 and created_by = $2", [inviteId, userId]);
}

export type InviteInfo = { valid: boolean; reason?: string; inviterName?: string; kind?: "friend" | "circle"; circleName?: string; circleEmoji?: string | null };

async function findInvite(token: string) {
  const [inv] = await q<{ id: string; created_by: string; kind: "friend" | "circle"; circle_id: string | null; uses: number; max_uses: number; expires_at: string; revoked_at: string | null }>(
    "select id, created_by, kind, circle_id, uses, max_uses, expires_at, revoked_at from public.invites where token_hash = $1",
    [hashToken(token)],
  );
  return inv ?? null;
}

export async function inviteInfo(token: string): Promise<InviteInfo> {
  const inv = await findInvite(token);
  if (!inv) return { valid: false, reason: "This invite link isn't valid." };
  if (inv.revoked_at) return { valid: false, reason: "This invite was cancelled." };
  if (Date.parse(inv.expires_at) < Date.now()) return { valid: false, reason: "This invite has expired. Ask for a new link." };
  if (inv.uses >= inv.max_uses) return { valid: false, reason: "This invite has already been used." };
  const info: InviteInfo = { valid: true, inviterName: await nameOf(inv.created_by), kind: inv.kind };
  if (inv.circle_id) {
    const [c] = await q<{ name: string; emoji: string | null }>("select name, emoji from public.circles where id = $1", [inv.circle_id]);
    info.circleName = c?.name;
    info.circleEmoji = c?.emoji;
  }
  return info;
}

/** Accepting an invite link = both sides agreed: creates the friendship (and circle membership). */
export async function redeemInvite(userId: string, token: string): Promise<{ friendId: string; circleId: string | null }> {
  const inv = await findInvite(token);
  const info = await inviteInfo(token);
  if (!inv || !info.valid) throw new SocialError(info.reason ?? "This invite isn't valid.");
  if (inv.created_by === userId) throw new SocialError("That's your own invite - share it with a friend.");
  if (await isBlocked(userId, inv.created_by)) throw new SocialError("This invite can't be used.", 403);

  const client = await pool().connect();
  try {
    await client.query("begin");
    const used = await client.query("update public.invites set uses = uses + 1 where id = $1 and uses < max_uses and revoked_at is null and expires_at > now()", [inv.id]);
    if (!used.rowCount) throw new SocialError("This invite has already been used.");
    const [lo, hi] = pair(userId, inv.created_by);
    await client.query(
      "insert into public.friendships (user_low, user_high, status) values ($1, $2, 'accepted') on conflict (user_low, user_high) do nothing",
      [lo, hi],
    );
    if (inv.circle_id) {
      const [{ n }] = (await client.query("select count(*)::int as n from public.circle_members where circle_id = $1", [inv.circle_id])).rows;
      if (n >= CIRCLE_MAX) throw new SocialError("This circle is full.");
      const [{ m }] = (await client.query("select count(*)::int as m from public.circle_members where user_id = $1", [userId])).rows;
      if (m >= MAX_CIRCLES_JOINED) throw new SocialError("You're already in the maximum number of circles.");
      await client.query("insert into public.circle_members (circle_id, user_id) values ($1, $2) on conflict do nothing", [inv.circle_id, userId]);
    }
    await client.query("commit");
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
  await Promise.all([awardSocial(userId), awardSocial(inv.created_by)]);
  const who = await nameOf(userId);
  await notify(inv.created_by, "invite_accepted", {
    title: inv.circle_id ? `${who} joined ${info.circleName}` : `${who} accepted your invite`,
    body: "You're now connected on PERSONA 90.",
    url: inv.circle_id ? `/circles/${inv.circle_id}` : "/friends",
  });
  return { friendId: inv.created_by, circleId: inv.circle_id };
}

export async function listFriends(userId: string) {
  const rows = await q<{ other: string; since: string; name: string }>(
    `select f.other, f.since, coalesce(nullif(p.display_name, ''), 'Member') as name from (
       select case when user_low = $1 then user_high else user_low end as other, created_at as since
         from public.friendships where (user_low = $1 or user_high = $1) and status = 'accepted') f
     join public.profiles p on p.id = f.other order by f.since desc`,
    [userId],
  );
  const ids = rows.map((r) => r.other);
  const [views, weeks] = await Promise.all([sharedViews(userId, ids), weekStats(ids)]);
  return rows.map((r) => {
    const view = views.get(r.other) ?? null;
    return { id: r.other, name: r.name, since: r.since, view, week: view?.shared.includes("activity") ? (weeks.get(r.other) ?? null) : null };
  });
}

export async function listBlocked(userId: string) {
  return q<{ id: string; name: string }>(
    `select case when f.user_low = $1 then f.user_high else f.user_low end as id, coalesce(nullif(p.display_name, ''), 'Member') as name
       from public.friendships f join public.profiles p on p.id = case when f.user_low = $1 then f.user_high else f.user_low end
      where (f.user_low = $1 or f.user_high = $1) and f.status = 'blocked' and f.blocked_by = $1`,
    [userId],
  );
}

export async function removeFriend(userId: string, other: string) {
  const [lo, hi] = pair(userId, other);
  await q("delete from public.friendships where user_low = $1 and user_high = $2 and status = 'accepted'", [lo, hi]);
}

/** Blocking hides everything both ways, ends the friendship and removes them from shared 1:1 races. */
export async function blockUser(userId: string, other: string) {
  if (userId === other) throw new SocialError("You can't block yourself.");
  const [lo, hi] = pair(userId, other);
  await q(
    `insert into public.friendships (user_low, user_high, status, blocked_by) values ($1, $2, 'blocked', $3)
     on conflict (user_low, user_high) do update set status = 'blocked', blocked_by = $3, updated_at = now()`,
    [lo, hi, userId],
  );
  await q(
    `delete from public.race_participants rp using public.races r
      where rp.race_id = r.id and r.circle_id is null and r.finalized_at is null
        and rp.user_id = $2 and exists (select 1 from public.race_participants me where me.race_id = r.id and me.user_id = $1)`,
    [userId, other],
  );
}

export async function unblockUser(userId: string, other: string) {
  const [lo, hi] = pair(userId, other);
  await q("delete from public.friendships where user_low = $1 and user_high = $2 and status = 'blocked' and blocked_by = $3", [lo, hi, userId]);
}

export async function report(userId: string, target: { userId?: string; circleId?: string }, reason: string, details: string) {
  const [{ n }] = await q<{ n: number }>("select count(*)::int as n from public.reports where reporter = $1 and created_at > now() - interval '1 day'", [userId]);
  if (n >= 10) throw new SocialError("You've sent several reports today. Thank you - we'll review them.", 429);
  await q("insert into public.reports (reporter, target_user, circle_id, reason, details) values ($1, $2, $3, $4, $5)", [
    userId,
    target.userId ?? null,
    target.circleId ?? null,
    reason.slice(0, 60),
    details.slice(0, 1000),
  ]);
  const { notifyAdminsOfReport } = await import("./admin");
  await notifyAdminsOfReport(reason.slice(0, 60)).catch(() => {});
}

// ---------------------------------------------------------------------------
// Cheers
// ---------------------------------------------------------------------------

export const CHEERS: Record<string, { emoji: string; text: string }> = {
  fire: { emoji: "🔥", text: "Keep the streak going!" },
  strong: { emoji: "💪", text: "You've got this - keep practising." },
  proud: { emoji: "🌟", text: "Proud of your progress." },
  clap: { emoji: "👏", text: "Well done today!" },
  note: { emoji: "💬", text: "" },
};

export async function sendCheer(from: string, to: string, kind: string, note: string | null, circleId: string | null) {
  if (!CHEERS[kind]) throw new SocialError("Unknown cheer.");
  if (from === to) throw new SocialError("You can't cheer yourself - but well done!");
  if (await isBlocked(from, to)) throw new SocialError("You can't send cheers to this person.", 403);
  const connected = circleId ? (await isMember(from, circleId)) && (await isMember(to, circleId)) : await areFriends(from, to);
  if (!connected) throw new SocialError("You can only cheer friends and circle members.", 403);
  const [lim] = await q<{ total: number; to_them: number }>(
    `select count(*)::int as total, count(*) filter (where to_user = $2)::int as to_them
       from public.cheers where from_user = $1 and created_at > now() - interval '1 day'`,
    [from, to],
  );
  if (lim.total >= 30 || lim.to_them >= 5) throw new SocialError("That's a lot of cheering today! Try again tomorrow.", 429);
  const text = note?.trim().slice(0, 140) || null;
  await q("insert into public.cheers (from_user, to_user, circle_id, kind, note) values ($1, $2, $3, $4, $5)", [from, to, circleId, kind, text]);
  const who = await nameOf(from);
  const c = CHEERS[kind];
  await notify(to, "cheer", { title: `${c.emoji} ${who} cheered you`, body: text ?? c.text, url: circleId ? `/circles/${circleId}` : "/friends" });
  await awardSocial(from);
}

// ---------------------------------------------------------------------------
// Circles
// ---------------------------------------------------------------------------

export const CIRCLE_MAX = 30;
const MAX_CIRCLES_OWNED = 5;
const MAX_CIRCLES_JOINED = 10;

async function isMember(userId: string, circleId: string) {
  const r = await q("select 1 from public.circle_members where circle_id = $1 and user_id = $2", [circleId, userId]);
  return r.length > 0;
}

async function roleOf(userId: string, circleId: string): Promise<"owner" | "admin" | "member" | null> {
  const [r] = await q<{ role: "owner" | "admin" | "member" }>("select role from public.circle_members where circle_id = $1 and user_id = $2", [circleId, userId]);
  return r?.role ?? null;
}

async function assertMember(userId: string, circleId: string) {
  if (!(await isMember(userId, circleId))) throw new SocialError("You're not a member of this circle.", 403);
}

export async function createCircle(userId: string, name: string, emoji: string | null) {
  await (await import("./plan")).assertWithinLimit(userId, "circle");
  const [{ owned, joined }] = await q<{ owned: number; joined: number }>(
    "select count(*) filter (where role = 'owner')::int as owned, count(*)::int as joined from public.circle_members where user_id = $1",
    [userId],
  );
  if (owned >= MAX_CIRCLES_OWNED) throw new SocialError(`You can own up to ${MAX_CIRCLES_OWNED} circles.`);
  if (joined >= MAX_CIRCLES_JOINED) throw new SocialError(`You can be in up to ${MAX_CIRCLES_JOINED} circles.`);
  const [c] = await q<{ id: string }>("insert into public.circles (name, emoji, owner_id) values ($1, $2, $3) returning id", [name.trim(), emoji, userId]);
  await q("insert into public.circle_members (circle_id, user_id, role) values ($1, $2, 'owner')", [c.id, userId]);
  await awardSocial(userId);
  return c.id;
}

export async function myCircles(userId: string) {
  return q<{ id: string; name: string; emoji: string | null; role: string; members: number; live_races: number }>(
    `select c.id, c.name, c.emoji, m.role,
       (select count(*)::int from public.circle_members x where x.circle_id = c.id) as members,
       (select count(*)::int from public.races r where r.circle_id = c.id and r.cancelled_at is null and now() between r.starts_at and r.ends_at) as live_races
     from public.circle_members m join public.circles c on c.id = m.circle_id where m.user_id = $1 order by c.created_at desc`,
    [userId],
  );
}

export async function circleBoard(viewer: string, circleId: string) {
  await assertMember(viewer, circleId);
  const [circle] = await q<{ id: string; name: string; emoji: string | null; owner_id: string; created_at: string }>(
    "select id, name, emoji, owner_id, created_at from public.circles where id = $1",
    [circleId],
  );
  const members = await q<{ user_id: string; role: string; name: string }>(
    `select m.user_id, m.role, coalesce(nullif(p.display_name, ''), 'Member') as name
       from public.circle_members m join public.profiles p on p.id = m.user_id where m.circle_id = $1 order by m.joined_at`,
    [circleId],
  );
  const ids = members.map((m) => m.user_id);
  const [views, weeks, mySnap] = await Promise.all([sharedViews(viewer, ids, circleId), weekStats(ids), loadSnapshots([viewer])]);
  const me = mySnap.get(viewer);
  const cheers = await q<{ from_name: string; to_name: string; kind: string; note: string | null; created_at: string }>(
    `select coalesce(nullif(pf.display_name, ''), 'Member') as from_name, coalesce(nullif(pt.display_name, ''), 'Member') as to_name, ch.kind, ch.note, ch.created_at
       from public.cheers ch join public.profiles pf on pf.id = ch.from_user join public.profiles pt on pt.id = ch.to_user
      where ch.circle_id = $1 and not exists (
        select 1 from public.friendships f where f.status = 'blocked'
          and ((f.user_low = least($2, ch.from_user) and f.user_high = greatest($2, ch.from_user))))
      order by ch.created_at desc limit 30`,
    [circleId, viewer],
  );
  const races = await q<{ id: string; title: string; kind: RaceKind; starts_at: string; ends_at: string; finalized_at: string | null; participants: number }>(
    `select r.id, r.title, r.kind, r.starts_at, r.ends_at, r.finalized_at,
       (select count(*)::int from public.race_participants p where p.race_id = r.id) as participants
     from public.races r where r.circle_id = $1 and r.cancelled_at is null order by r.ends_at desc limit 20`,
    [circleId],
  );
  return {
    circle,
    myRole: members.find((m) => m.user_id === viewer)?.role ?? "member",
    members: members.map((m) => {
      const view = m.user_id === viewer && me ? filterSnapshot(me, ["activity", "xp", "badges", "challenges", "growth", "scores", "focus"], todayIn(me.timezone)) : (views.get(m.user_id) ?? null);
      return { id: m.user_id, role: m.role, name: m.name, isMe: m.user_id === viewer, view, week: view?.shared.includes("activity") ? (weeks.get(m.user_id) ?? null) : null };
    }),
    cheers,
    races,
  };
}

export async function leaveCircle(userId: string, circleId: string) {
  const role = await roleOf(userId, circleId);
  if (!role) return;
  if (role === "owner") {
    const [next] = await q<{ user_id: string }>(
      "select user_id from public.circle_members where circle_id = $1 and user_id <> $2 order by (role = 'admin') desc, joined_at limit 1",
      [circleId, userId],
    );
    if (!next) {
      await q("delete from public.circles where id = $1", [circleId]);
      return;
    }
    await q("update public.circle_members set role = 'owner' where circle_id = $1 and user_id = $2", [circleId, next.user_id]);
    await q("update public.circles set owner_id = $2 where id = $1", [circleId, next.user_id]);
  }
  await q("delete from public.circle_members where circle_id = $1 and user_id = $2", [circleId, userId]);
  await q("delete from public.share_settings where circle_id = $1 and user_id = $2", [circleId, userId]);
}

export async function removeMember(actor: string, circleId: string, target: string) {
  const [a, t] = await Promise.all([roleOf(actor, circleId), roleOf(target, circleId)]);
  if (!a || a === "member") throw new SocialError("Only the owner or an admin can remove members.", 403);
  if (!t) return;
  if (t === "owner" || (t === "admin" && a !== "owner")) throw new SocialError("You can't remove this member.", 403);
  await q("delete from public.circle_members where circle_id = $1 and user_id = $2", [circleId, target]);
}

export async function setMemberRole(actor: string, circleId: string, target: string, role: "admin" | "member") {
  if ((await roleOf(actor, circleId)) !== "owner") throw new SocialError("Only the owner can change roles.", 403);
  if ((await roleOf(target, circleId)) === "owner") throw new SocialError("The owner's role can't be changed.");
  await q("update public.circle_members set role = $3 where circle_id = $1 and user_id = $2", [circleId, target, role]);
}

export async function renameCircle(actor: string, circleId: string, name: string, emoji: string | null) {
  const r = await roleOf(actor, circleId);
  if (r !== "owner" && r !== "admin") throw new SocialError("Only the owner or an admin can edit the circle.", 403);
  await q("update public.circles set name = $2, emoji = $3 where id = $1", [circleId, name.trim(), emoji]);
}

// ---------------------------------------------------------------------------
// Races
// ---------------------------------------------------------------------------

type RaceRow = {
  id: string;
  circle_id: string | null;
  created_by: string;
  title: string;
  kind: RaceKind;
  teams: boolean;
  starts_at: string;
  ends_at: string;
  finalized_at: string | null;
  cancelled_at: string | null;
};

export async function createRace(
  userId: string,
  input: { circleId: string | null; friendId: string | null; kind: RaceKind; days: number; teams: boolean; title?: string },
) {
  if (!RACE_KINDS.some((k) => k.id === input.kind)) throw new SocialError("Unknown race type.");
  await (await import("./plan")).assertWithinLimit(userId, "race");
  if (input.circleId) await assertMember(userId, input.circleId);
  else if (!input.friendId || !(await areFriends(userId, input.friendId))) throw new SocialError("Pick a friend or a circle for the race.");
  const [{ n }] = await q<{ n: number }>("select count(*)::int as n from public.races where created_by = $1 and created_at > now() - interval '1 day'", [userId]);
  if (n >= 10) throw new SocialError("You've started several races today. Try again tomorrow.", 429);
  const days = Math.min(30, Math.max(1, Math.round(input.days)));
  const kind = RACE_KINDS.find((k) => k.id === input.kind)!;
  const title = (input.title?.trim() || `${days}-day ${kind.label.toLowerCase()}`).slice(0, 80);
  const [race] = await q<{ id: string }>(
    "insert into public.races (circle_id, created_by, title, kind, teams, starts_at, ends_at) values ($1, $2, $3, $4, $5, now(), now() + make_interval(days => $6)) returning id",
    [input.circleId, userId, title, input.kind, Boolean(input.circleId && input.teams), days],
  );
  await q("insert into public.race_participants (race_id, user_id, team) values ($1, $2, $3)", [race.id, userId, input.teams && input.circleId ? 1 : null]);
  const who = await nameOf(userId);
  const recipients = input.circleId
    ? (await q<{ user_id: string }>("select user_id from public.circle_members where circle_id = $1 and user_id <> $2", [input.circleId, userId])).map((r) => r.user_id)
    : [input.friendId!];
  await Promise.all(
    recipients.map((r) => notify(r, "race_invite", { title: `🏁 ${who} started a race: ${title}`, body: `${kind.description} Join before it ends!`, url: `/races/${race.id}` })),
  );
  return race.id;
}

async function getRace(raceId: string) {
  const [r] = await q<RaceRow>("select * from public.races where id = $1", [raceId]);
  if (!r || r.cancelled_at) throw new SocialError("Race not found.", 404);
  return r;
}

async function canSeeRace(viewer: string, r: RaceRow) {
  if (r.circle_id) return isMember(viewer, r.circle_id);
  const p = await q("select 1 from public.race_participants where race_id = $1 and user_id = $2", [r.id, viewer]);
  if (p.length) return true;
  // A 1:1 friend race is visible to the invited friend before they join.
  return areFriends(viewer, r.created_by);
}

export async function joinRace(userId: string, raceId: string, privately: boolean) {
  const r = await getRace(raceId);
  if (!(await canSeeRace(userId, r))) throw new SocialError("You can't join this race.", 403);
  if (Date.parse(r.ends_at) < Date.now()) throw new SocialError("This race has finished.");
  if (!r.circle_id) {
    const [{ n }] = await q<{ n: number }>("select count(*)::int as n from public.race_participants where race_id = $1", [raceId]);
    if (n >= 2) throw new SocialError("This 1:1 race is full.");
  }
  let team: number | null = null;
  if (r.teams) {
    const [t] = await q<{ t1: number; t2: number }>(
      "select count(*) filter (where team = 1)::int as t1, count(*) filter (where team = 2)::int as t2 from public.race_participants where race_id = $1",
      [raceId],
    );
    team = t.t1 <= t.t2 ? 1 : 2;
  }
  await q("insert into public.race_participants (race_id, user_id, team, private) values ($1, $2, $3, $4) on conflict (race_id, user_id) do update set private = excluded.private", [
    raceId,
    userId,
    team,
    privately,
  ]);
}

export async function leaveRace(userId: string, raceId: string) {
  await q("delete from public.race_participants where race_id = $1 and user_id = $2", [raceId, userId]);
}

/** Activity events for each participant inside [from, to] - counts and dates only. */
async function raceEvents(ids: string[], from: string, to: string): Promise<Map<string, RaceEvents>> {
  const rows = await q<RaceEvents & { id: string; session_dates: string[] | null }>(
    `select u.id,
       (select array_agg(s.session_date::text) from public.daily_sessions s where s.user_id = u.id and s.completed_at between $2 and $3) as session_dates,
       (select count(*)::int from public.daily_sessions s where s.user_id = u.id and s.completed_at between $2 and $3) as sessions,
       (select count(*)::int from public.daily_checkins c where c.user_id = u.id and c.completed_at between $2 and $3) as checkins,
       (select count(*)::int from public.daily_sessions s where s.user_id = u.id and s.challenge_status = 'completed' and s.challenge_updated_at between $2 and $3) as challenges,
       (select count(*)::int from public.daily_sessions s where s.user_id = u.id and s.story_completed_at between $2 and $3) as "storiesRead",
       (select count(*)::int from public.scenario_responses x where x.user_id = u.id and x.score is not null and x.created_at between $2 and $3) as scenarios,
       (select count(*)::int from public.decision_logs d where d.user_id = u.id and d.completed_at between $2 and $3) as decisions,
       (select count(*)::int from public.exercise_completions e where e.user_id = u.id and e.completed_at between $2 and $3) as communication,
       (select count(*)::int from public.journal_entries j where j.user_id = u.id and j.created_at between $2 and $3) as journal
     from unnest($1::text[]) as u(id)`,
    [ids, from, to],
  );
  return new Map(rows.map((r) => [r.id, { ...r, sessionDates: r.session_dates ?? [] }]));
}

export async function raceView(viewer: string, raceId: string) {
  const r = await getRace(raceId);
  if (!(await canSeeRace(viewer, r))) throw new SocialError("You can't see this race.", 403);
  const now = Date.now();
  const ended = Date.parse(r.ends_at) <= now;
  const parts = await q<{ user_id: string; team: number | null; private: boolean; final_score: number | null; final_rank: number | null; name: string }>(
    `select rp.user_id, rp.team, rp.private, rp.final_score, rp.final_rank, coalesce(nullif(p.display_name, ''), 'Member') as name
       from public.race_participants rp join public.profiles p on p.id = rp.user_id where rp.race_id = $1`,
    [raceId],
  );

  let scored: { user_id: string; score: number }[];
  if (r.finalized_at) {
    scored = parts.map((p) => ({ user_id: p.user_id, score: p.final_score ?? 0 }));
  } else {
    const events = await raceEvents(parts.map((p) => p.user_id), r.starts_at, new Date(Math.min(now, Date.parse(r.ends_at))).toISOString());
    scored = parts.map((p) => ({ user_id: p.user_id, score: raceScore(r.kind, events.get(p.user_id)!) }));
    if (ended) {
      // Freeze results the first time a finished race is opened.
      const ranked = rankScores(scored);
      const client = await pool().connect();
      try {
        await client.query("begin");
        const lock = await client.query("update public.races set finalized_at = now() where id = $1 and finalized_at is null", [raceId]);
        if (lock.rowCount) {
          for (const x of ranked) {
            await client.query("update public.race_participants set final_score = $3, final_rank = $4 where race_id = $1 and user_id = $2", [raceId, x.user_id, x.score, x.rank]);
          }
        }
        await client.query("commit");
      } catch {
        await client.query("rollback").catch(() => {});
      } finally {
        client.release();
      }
      await Promise.all(parts.map((p) => awardSocial(p.user_id)));
    }
  }

  const ranked = rankScores(scored);
  const blocked = new Set(
    (
      await q<{ other: string }>(
        `select case when user_low = $1 then user_high else user_low end as other from public.friendships
          where (user_low = $1 or user_high = $1) and status = 'blocked'`,
        [viewer],
      )
    ).map((b) => b.other),
  );
  const rows = ranked
    .filter((x) => !blocked.has(x.user_id))
    .map((x) => {
      const p = parts.find((pp) => pp.user_id === x.user_id)!;
      const hidden = p.private && p.user_id !== viewer;
      return { userId: hidden ? null : p.user_id, name: hidden ? "A member" : p.name, isMe: p.user_id === viewer, score: x.score, rank: x.rank, team: p.team };
    });
  const teamTotals = r.teams
    ? [1, 2].map((t) => ({ team: t, score: rows.filter((x) => x.team === t).reduce((a, b) => a + b.score, 0) }))
    : null;
  return {
    race: { id: r.id, title: r.title, kind: r.kind, teams: r.teams, circleId: r.circle_id, startsAt: r.starts_at, endsAt: r.ends_at, ended, createdBy: r.created_by },
    rows,
    teamTotals,
    joined: parts.some((p) => p.user_id === viewer),
  };
}

export async function myRaces(userId: string) {
  return q<{ id: string; title: string; kind: RaceKind; ends_at: string; circle_id: string | null; joined: boolean }>(
    `select r.id, r.title, r.kind, r.ends_at, r.circle_id, exists (select 1 from public.race_participants p where p.race_id = r.id and p.user_id = $1) as joined
       from public.races r
      where r.cancelled_at is null and r.ends_at > now() - interval '14 days'
        and (exists (select 1 from public.race_participants p where p.race_id = r.id and p.user_id = $1)
             or (r.circle_id is not null and exists (select 1 from public.circle_members m where m.circle_id = r.circle_id and m.user_id = $1)))
      order by r.ends_at desc limit 20`,
    [userId],
  );
}

/** Counts for social badges. */
export async function socialStats(userId: string) {
  const [r] = await q<{ friends: number; owned: number; cheers: number; finished: number; team_wins: number }>(
    `select
       (select count(*)::int from public.friendships where (user_low = $1 or user_high = $1) and status = 'accepted') as friends,
       (select count(*)::int from public.circle_members where user_id = $1 and role = 'owner') as owned,
       (select count(*)::int from public.cheers where from_user = $1) as cheers,
       (select count(*)::int from public.race_participants rp join public.races r on r.id = rp.race_id where rp.user_id = $1 and r.finalized_at is not null) as finished,
       (select count(*)::int from public.race_participants rp join public.races r on r.id = rp.race_id
          where rp.user_id = $1 and r.teams and r.finalized_at is not null and rp.team = (
            select x.team from public.race_participants x where x.race_id = r.id group by x.team order by sum(x.final_score) desc limit 1)) as team_wins`,
    [userId],
  );
  return r;
}

