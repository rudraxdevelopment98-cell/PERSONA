import { checkCostAlert, sendDailyReminders } from "@/lib/server/reminders";
import { sendCircleRecaps, sendStreakNudges } from "@/lib/server/streaks";
import { sendPollResults } from "@/lib/server/poll";
import { checkErrorSpike } from "@/lib/server/errors";
import { runSignalsJob } from "@/lib/server/signals";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Called every hour by the GitHub "Hourly jobs" workflow (and once a day by Vercel Cron as a backup).
 * CRON_SECRET must be set in production and sent as a Bearer token: the job does
 * real work (AI signal extraction, push, redaction), so it must not be publicly
 * triggerable. Without the secret only non-production builds may run it, to keep
 * local and preview testing simple. The job itself is safe to run repeatedly:
 * each person gets at most one reminder per day.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Fail closed in production: an unset secret must never leave this open to the public.
    if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
      return new Response("Cron is not configured.", { status: 503 });
    }
  } else if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const result = await sendDailyReminders();
  const streaks = await sendStreakNudges().catch((e) => ({ error: (e as Error).message }));
  const recaps = await sendCircleRecaps().catch((e) => ({ error: (e as Error).message }));
  const polls = await sendPollResults().catch((e) => ({ error: (e as Error).message }));
  const errors = await checkErrorSpike().catch((e) => ({ error: (e as Error).message }));
  const cost = await checkCostAlert().catch((e) => ({ error: (e as Error).message }));
  // Own words -> private signals, then wipe words past the window.
  const signals = await runSignalsJob().catch((e) => ({ error: (e as Error).message }));
  return Response.json({ ...result, streaks, recaps, polls, errors, cost, signals });
}
