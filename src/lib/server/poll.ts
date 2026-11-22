import "server-only";
import { getPool } from "@/lib/db/pool";
import { todayIn } from "@/lib/domain/programme";
import { pollFor, pollText } from "@/lib/domain/poll";
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
  const poll = pollFor(date);
  const t = pollText(poll, p?.language);
  const [mine] = await q<{ choice: number }>("select choice from public.poll_votes where user_id = $1 and poll_date = $2", [userId, date]);
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
