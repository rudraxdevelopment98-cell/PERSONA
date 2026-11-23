import "server-only";
import { getPool } from "@/lib/db/pool";
import { todayIn } from "@/lib/domain/programme";
import { POLLS, pollFor, pollText } from "@/lib/domain/poll";
import { itemsVisibleTo, loadSnapshots } from "./social";

const q = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await getPool().query(sql, params)).rows as T[];

export type PollView = {
  id: string;
  date: string;
  skill: string;
  question: string;
  options: string[];
  tip: string;
  myChoice: number | null;
  counts: number[];
  total: number;
  /** Friends (who share their activity with you) who picked the same answer. */
  friendsSame: { name: string; emoji: string | null; cover: string | null }[];
  friendsVoted: number;
};

export async function todayPoll(userId: string): Promise<PollView> {
  const [p] = await q<{ timezone: string; language: string | null }>("select timezone, language from public.profiles where id = $1", [userId]);
  const date = todayIn(p?.timezone ?? "UTC");
  const [mine] = await q<{ choice: number; poll_id: string }>("select choice, poll_id from public.poll_votes where user_id = $1 and poll_date = $2", [userId, date]);
  // Show the poll the person actually answered, even if today's rotation changed after they voted.
  const poll = (mine && POLLS.find((x) => x.id === mine.poll_id)) || pollFor(date);
  const t = pollText(poll, p?.language);
  const view: PollView = { id: poll.id, date, skill: poll.skill, question: t.q, options: t.o, tip: t.tip, myChoice: mine?.choice ?? null, counts: [0, 0, 0], total: 0, friendsSame: [], friendsVoted: 0 };
  // Results only after you vote, so the crowd doesn't steer the answer.
  if (view.myChoice === null) return view;
  const counts = await q<{ choice: number; n: number }>(
    "select choice, count(*)::int as n from public.poll_votes where poll_date = $1 and poll_id = $2 group by choice",
    [date, poll.id],
  );
  for (const c of counts) view.counts[c.choice] = c.n;
  view.total = view.counts.reduce((a, b) => a + b, 0);
  const friends = await q<{ id: string; choice: number }>(
    `select v.user_id as id, v.choice from public.poll_votes v
      join public.friendships f on f.status = 'accepted' and ((f.user_low = $1 and f.user_high = v.user_id) or (f.user_high = $1 and f.user_low = v.user_id))
      where v.poll_date = $2 and v.poll_id = $3`,
    [userId, date, poll.id],
  );
  if (friends.length) {
    const access = await itemsVisibleTo(userId, friends.map((f) => f.id));
    const visible = friends.filter((f) => access.get(f.id)?.includes("activity"));
    view.friendsVoted = visible.length;
    const same = visible.filter((f) => f.choice === view.myChoice).slice(0, 5);
    const snaps = await loadSnapshots(same.map((f) => f.id));
    view.friendsSame = same.map((f) => {
      const s = snaps.get(f.id);
      return { name: s?.display_name ?? "Friend", emoji: s?.avatar_emoji ?? null, cover: s?.cover ?? null };
    });
  }
  return view;
}

export async function votePoll(userId: string, choice: number) {
  if (!Number.isInteger(choice) || choice < 0 || choice > 2) throw new Error("bad choice");
  const [p] = await q<{ timezone: string }>("select timezone from public.profiles where id = $1", [userId]);
  const date = todayIn(p?.timezone ?? "UTC");
  await q("insert into public.poll_votes (user_id, poll_date, poll_id, choice) values ($1, $2, $3, $4) on conflict (user_id, poll_date) do nothing", [
    userId,
    date,
    pollFor(date).id,
    choice,
  ]);
  return todayPoll(userId);
}

/**
 * Evening nudge from the daily job: "62% chose the same as you". Only for people who voted today,
 * have reminders on, already showed up today (so it never doubles the "episode waiting" reminder),
 * once a day, between 16:00 and 22:00 local time.
 */
export async function sendPollResults(now = new Date()) {
  const { notifyIn } = await import("./social");
  const rows = await q<{ user_id: string; timezone: string; poll_date: string; poll_id: string; choice: number }>(
    `select v.user_id, p.timezone, v.poll_date::text, v.poll_id, v.choice
       from public.poll_votes v join public.profiles p on p.id = v.user_id
      where v.poll_date >= current_date - 1 and p.reminders_enabled and p.suspended_at is null
        and exists (select 1 from public.push_subscriptions s where s.user_id = v.user_id)`,
  );
  let sent = 0;
  for (const r of rows) {
    if (todayIn(r.timezone) !== r.poll_date) continue;
    const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: r.timezone || "UTC" }).format(now));
    if (hour < 16 || hour >= 22) continue;
    const done = await q(
      `select 1 where exists (select 1 from public.daily_checkins where user_id = $1 and checkin_date = $2 and completed_at is not null)
          or exists (select 1 from public.daily_sessions where user_id = $1 and session_date = $2 and completed_at is not null)`,
      [r.user_id, r.poll_date],
    );
    if (!done.length) continue;
    const dup = await q("select 1 from public.notifications where user_id = $1 and type = 'poll_result' and payload->>'date' = $2", [r.user_id, r.poll_date]);
    if (dup.length) continue;
    const counts = await q<{ choice: number; n: number }>("select choice, count(*)::int as n from public.poll_votes where poll_date = $1 and poll_id = $2 group by choice", [
      r.poll_date,
      r.poll_id,
    ]);
    const total = counts.reduce((a, c) => a + c.n, 0);
    if (total < 3) continue;
    const same = Math.round(((counts.find((c) => c.choice === r.choice)?.n ?? 0) / total) * 100);
    await notifyIn(r.user_id, "poll_result", {
      title: ["poll.title", same],
      body: ["poll.body", total],
      url: "/dashboard",
      date: r.poll_date,
    });
    sent++;
  }
  return { voters: rows.length, sent };
}
