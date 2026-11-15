import "server-only";
import { getPool } from "@/lib/db/pool";
import { todayIn } from "@/lib/domain/programme";
import { sendPush } from "./push";

/**
 * Evening nudge for people who haven't done today's session: tomorrow's
 * teaser and their streak. Only users with notifications turned on, never
 * at night in their own timezone, and at most once per local day.
 */
export async function sendDailyReminders(now = new Date()) {
  const pool = getPool();
  const { rows } = await pool.query<{
    id: string;
    timezone: string;
    programme_start_date: string;
    last_reminder_date: string | null;
    streak: number | null;
    last_active_date: string | null;
  }>(
    `select p.id, p.timezone, p.programme_start_date::text, p.last_reminder_date::text,
            s.streak, s.last_active_date::text
       from public.profiles p
       left join public.share_snapshots s on s.user_id = p.id
      where p.reminders_enabled and p.suspended_at is null and p.programme_start_date is not null
        and exists (select 1 from public.push_subscriptions ps where ps.user_id = p.id)`,
  );
  let sent = 0;
  for (const u of rows) {
    const today = todayIn(u.timezone);
    if (u.last_reminder_date === today) continue;
    const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: u.timezone || "UTC" }).format(now));
    if (hour < 9 || hour >= 22) continue;
    const done = await pool.query("select 1 from public.daily_sessions where user_id = $1 and session_date = $2 and completed_at is not null", [u.id, today]);
    if (done.rowCount) continue;
    const { rows: last } = await pool.query<{ variety: { season: number; episode: number; teaser?: string; finale?: boolean } | null }>(
      "select variety from public.daily_sessions where user_id = $1 and variety is not null order by day_number desc limit 1",
      [u.id],
    );
    const v = last[0]?.variety;
    // Claim today's reminder first so parallel runs can't double-send.
    const claim = await pool.query(
      "update public.profiles set last_reminder_date = $2 where id = $1 and (last_reminder_date is null or last_reminder_date < $2)",
      [u.id, today],
    );
    if (!claim.rowCount) continue;
    const streakAlive = u.streak && u.last_active_date && (Date.parse(today) - Date.parse(u.last_active_date)) / 86_400_000 <= 2 ? u.streak : 0;
    const title = v && !v.finale ? `🎬 Episode ${v.episode + 1} is waiting` : v?.finale ? "🎬 A new season starts today" : "🌱 Your session is ready";
    const body = [
      v && !v.finale && v.teaser ? v.teaser : "30 minutes: a new story, three scenarios and today's mission.",
      streakAlive >= 2 ? `Keep your ${streakAlive}-day streak going 🔥` : "",
    ]
      .filter(Boolean)
      .join(" ");
    await sendPush(u.id, { title, body: body.slice(0, 220), url: "/today" });
    sent++;
  }
  return { checked: rows.length, sent };
}
