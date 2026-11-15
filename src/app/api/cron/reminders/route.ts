import { sendDailyReminders } from "@/lib/server/reminders";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Called once a day by Vercel Cron. If CRON_SECRET is set, Vercel sends it
 * and we require it. Either way the job is safe to run repeatedly: each
 * person gets at most one reminder per day.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const result = await sendDailyReminders();
  return Response.json(result);
}
