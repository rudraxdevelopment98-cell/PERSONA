import "server-only";
import { msg } from "@/lib/domain/messages";
import { getPool } from "@/lib/db/pool";
import { todayIn } from "@/lib/domain/programme";
import { duoStreak } from "@/lib/domain/moments";
import { liveStreak } from "@/lib/domain/social";
import { SocialError, areFriends, isBlocked, itemsVisibleTo, loadSnapshots, nameOf, notify, notifyIn, userLanguage } from "./social";

/**
 * Friend-streak nudges and weekly circle highlights. Only people who share their
 * activity with each other are involved; nobody learns more than the friends list shows.
 */

const q = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await getPool().query(sql, params)).rows as T[];

/** Local dates (last 120 days) each person showed up: a completed check-in or session. */
export async function showUpDates(ids: string[]): Promise<Map<string, string[]>> {
  if (ids.length === 0) return new Map();
  const rows = await q<{ user_id: string; d: string }>(
    `select user_id, checkin_date::text as d from public.daily_checkins where user_id = any($1) and completed_at is not null and checkin_date > current_date - 120
     union select user_id, session_date::text from public.daily_sessions where user_id = any($1) and completed_at is not null and session_date > current_date - 120`,
    [ids],
  );
  const out = new Map<string, string[]>(ids.map((i) => [i, []]));
  for (const r of rows) out.get(r.user_id)!.push(r.d);
  return out;
}

async function sharesActivity(viewer: string, target: string, circleId?: string) {
  return Boolean((await itemsVisibleTo(viewer, [target], circleId)).get(target)?.includes("activity"));
}

// ---------------------------------------------------------------------------
// Manual nudge
// ---------------------------------------------------------------------------

/** "I'm done, your turn": once per friend per day, only when the sender showed up today and the friend hasn't. */
export async function sendNudge(from: string, to: string) {
  if (from === to) throw new SocialError("You can't nudge yourself.");
  if (!(await areFriends(from, to)) || (await isBlocked(from, to))) throw new SocialError("You can only nudge friends.", 403);
  if (!(await sharesActivity(from, to)) || !(await sharesActivity(to, from))) throw new SocialError("Nudges work when you both share your activity.", 403);
  const tz = await q<{ id: string; timezone: string }>("select id, timezone from public.profiles where id = any($1)", [[from, to]]);
  const tzOf = (id: string) => tz.find((t) => t.id === id)?.timezone ?? "UTC";
  const dates = await showUpDates([from, to]);
  const myToday = todayIn(tzOf(from));
  const theirToday = todayIn(tzOf(to));
  if (!dates.get(from)!.includes(myToday)) throw new SocialError("Check in yourself first, then nudge.");
  if (dates.get(to)!.includes(theirToday)) throw new SocialError("They've already shown up today 🎉");
  const duo = duoStreak(dates.get(from)!, dates.get(to)!, myToday);
  const ins = await q(
    "insert into public.nudges (from_user, to_user, about_user, kind, nudge_date) values ($1, $2, $1, 'manual', $3) on conflict do nothing returning id",
    [from, to, theirToday],
  );
  if (ins.length === 0) throw new SocialError("You've already nudged them today.", 429);
  const who = await nameOf(from);
  await notifyIn(to, "streak_nudge", {
    title: duo.streak > 0 ? ["nudge.waiting", who] : ["nudge.nudged", who],
    body: duo.streak > 0 ? ["nudge.keep", duo.streak] : ["nudge.start", who],
    url: "/today",
  });
  return { streak: duo.streak };
}

// ---------------------------------------------------------------------------
// Automatic evening reminder (daily cron)
// ---------------------------------------------------------------------------

const localHour = (tz: string, now: Date) => Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: tz || "UTC" }).format(now));

/** "Your 5-day streak with Asha ends tonight": for friend streaks of 2+ where only one of you showed up today. */
export async function sendStreakNudges(now = new Date()) {
  const pairs = await q<{ a: string; b: string }>("select user_low as a, user_high as b from public.friendships where status = 'accepted'");
  if (pairs.length === 0) return { pairs: 0, sent: 0 };
  const ids = [...new Set(pairs.flatMap((p) => [p.a, p.b]))];
  const people = await q<{ id: string; timezone: string; reminders: boolean; active: boolean }>(
    "select id, timezone, reminders_enabled as reminders, (suspended_at is null and not social_paused) as active from public.profiles where id = any($1)",
    [ids],
  );
  const info = new Map(people.map((p) => [p.id, p]));
  const dates = await showUpDates(ids);
  let sent = 0;
  for (const { a, b } of pairs) {
    for (const [missing, done] of [
      [a, b],
      [b, a],
    ] as const) {
      const m = info.get(missing);
      const d = info.get(done);
      if (!m?.active || !d?.active || !m.reminders) continue;
      const today = todayIn(m.timezone);
      const hour = localHour(m.timezone, now);
      if (hour < 16 || hour >= 22) continue;
      const duo = duoStreak(dates.get(missing) ?? [], dates.get(done) ?? [], today);
      if (duo.streak < 2 || duo.todayMe || !duo.todayThem) continue;
      if (!(await sharesActivity(missing, done)) || !(await sharesActivity(done, missing))) continue;
      const ins = await q(
        "insert into public.nudges (to_user, about_user, kind, nudge_date) values ($1, $2, 'auto', $3) on conflict do nothing returning id",
        [missing, done, today],
      );
      if (ins.length === 0) continue;
      const who = await nameOf(done);
      await notifyIn(missing, "streak_risk", {
        title: ["risk.title", duo.streak, who],
        body: ["risk.body", who],
        url: "/today",
      });
      sent++;
    }
  }
  return { pairs: pairs.length, sent };
}

// ---------------------------------------------------------------------------
// Weekly circle highlights
// ---------------------------------------------------------------------------

export type CircleWeek = {
  members: number;
  sharing: number;
  checkins: number;
  sessions: number;
  challenges: number;
  fullHouse: number;
  days: { date: string; done: number }[];
  topStreak: { name: string; streak: number } | null;
  hype: { name: string; cheers: number } | null;
};

/** The last 7 days in a circle, counting only members who share their activity there. */
export async function circleWeek(viewer: string, circleId: string): Promise<CircleWeek> {
  const members = (await q<{ user_id: string }>("select user_id from public.circle_members where circle_id = $1", [circleId])).map((r) => r.user_id);
  if (!members.includes(viewer)) throw new SocialError("You're not a member of this circle.", 403);
  const access = await itemsVisibleTo(viewer, members, circleId);
  const sharing = members.filter((m) => m === viewer || access.get(m)?.includes("activity"));
  const [tz] = await q<{ timezone: string }>("select timezone from public.profiles where id = $1", [viewer]);
  const today = todayIn(tz?.timezone ?? "UTC");
  const days = Array.from({ length: 7 }, (_, i) => new Date(Date.parse(`${today}T00:00:00Z`) - (6 - i) * 86_400_000).toISOString().slice(0, 10));
  const dates = await showUpDates(sharing);
  const perDay = days.map((d) => ({ date: d, done: sharing.filter((m) => dates.get(m)?.includes(d)).length }));
  const [counts] = await q<{ checkins: number; sessions: number; challenges: number }>(
    `select
       (select count(*)::int from public.daily_checkins where user_id = any($1) and completed_at > now() - interval '7 days') as checkins,
       (select count(*)::int from public.daily_sessions where user_id = any($1) and completed_at > now() - interval '7 days') as sessions,
       (select count(*)::int from public.daily_sessions where user_id = any($1) and challenge_status = 'completed' and challenge_updated_at > now() - interval '7 days') as challenges`,
    [sharing],
  );
  const snaps = await loadSnapshots(sharing);
  let topStreak: CircleWeek["topStreak"] = null;
  for (const id of sharing) {
    const s = snaps.get(id);
    if (!s) continue;
    const streak = liveStreak(s.streak, s.last_active_date, todayIn(s.timezone));
    if (streak >= 2 && (!topStreak || streak > topStreak.streak)) topStreak = { name: id === viewer ? "You" : s.display_name, streak };
  }
  // Cheers inside the circle are already public to its members.
  const [hypeRow] = await q<{ id: string; n: number }>(
    `select from_user as id, count(*)::int as n from public.cheers where circle_id = $1 and created_at > now() - interval '7 days'
      group by from_user order by n desc limit 1`,
    [circleId],
  );
  const hype = hypeRow && hypeRow.n >= 2 && members.includes(hypeRow.id) ? { name: hypeRow.id === viewer ? "You" : await nameOf(hypeRow.id), cheers: hypeRow.n } : null;
  return {
    members: members.length,
    sharing: sharing.length,
    ...counts,
    fullHouse: sharing.length >= 2 ? perDay.filter((d) => d.done === sharing.length).length : 0,
    days: perDay,
    topStreak,
    hype,
  };
}

/** Monday recap in each member's inbox (push only for people with reminders on). */
export async function sendCircleRecaps(now = new Date()) {
  if (now.getUTCDay() !== 1) return { circles: 0, sent: 0 };
  const circles = await q<{ id: string; name: string; emoji: string | null }>(
    "select c.id, c.name, c.emoji from public.circles c where (select count(*) from public.circle_members m where m.circle_id = c.id) >= 2",
  );
  let sent = 0;
  for (const c of circles) {
    const members = await q<{ user_id: string; reminders: boolean; paused: boolean }>(
      `select m.user_id, p.reminders_enabled as reminders, p.social_paused as paused
         from public.circle_members m join public.profiles p on p.id = m.user_id where m.circle_id = $1`,
      [c.id],
    );
    for (const m of members) {
      if (m.paused) continue;
      const dup = await q(
        "select 1 from public.notifications where user_id = $1 and type = 'circle_recap' and payload->>'circle' = $2 and created_at > now() - interval '6 days'",
        [m.user_id, c.id],
      );
      if (dup.length) continue;
      const w = await circleWeek(m.user_id, c.id).catch(() => null);
      if (!w || w.checkins + w.sessions === 0) continue;
      const lang = await userLanguage(m.user_id);
      const bits = [msg(lang, "recap.checkins", w.checkins), msg(lang, "recap.episodes", w.sessions)];
      if (w.fullHouse) bits.push(msg(lang, "recap.fullHouse", w.fullHouse));
      if (w.topStreak) bits.push(w.topStreak.name === "You" ? msg(lang, "recap.yourStreak", w.topStreak.streak) : msg(lang, "recap.theirStreak", w.topStreak.name, w.topStreak.streak));
      await notify(
        m.user_id,
        "circle_recap",
        { title: msg(lang, "recap.title", c.emoji ?? "👥", c.name), body: bits.join(" · "), url: `/circles/${c.id}`, circle: c.id },
        { push: m.reminders },
      );
      sent++;
    }
  }
  return { circles: circles.length, sent };
}
