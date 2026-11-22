import { checkCostAlert, sendDailyReminders } from "@/lib/server/reminders";
import { sendCircleRecaps, sendStreakNudges } from "@/lib/server/streaks";
import { sendPollResults } from "@/lib/server/poll";
import { checkErrorSpike } from "@/lib/server/errors";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Called every hour by the GitHub "Hourly jobs" workflow (and once a day by Vercel Cron as a backup). If CRON_SECRET is set, Vercel sends it
 * and we require it. Either way the job is safe to run repeatedly: each
 * person gets at most one reminder per day.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const result = await sendDailyReminders();
  const streaks = await sendStreakNudges().catch((e) => ({ error: (e as Error).message }));
  const recaps = await sendCircleRecaps().catch((e) => ({ error: (e as Error).message }));
  const polls = await sendPollResults().catch((e) => ({ error: (e as Error).message }));
  const errors = await checkErrorSpike().catch((e) => ({ error: (e as Error).message }));
  const cost = await checkCostAlert().catch((e) => ({ error: (e as Error).message }));
  return Response.json({ ...result, streaks, recaps, polls, errors, cost });
}
