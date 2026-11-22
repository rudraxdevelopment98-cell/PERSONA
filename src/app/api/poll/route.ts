import { getSessionUser } from "@/lib/db/server";
import { votePoll } from "@/lib/server/poll";

export const dynamic = "force-dynamic";

/** Vote in today's poll (once a day; a second vote is ignored) and get the results. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { choice?: unknown };
  const choice = Number(body.choice);
  if (!Number.isInteger(choice) || choice < 0 || choice > 2) return Response.json({ error: "Pick an answer." }, { status: 400 });
  return Response.json({ poll: await votePoll(user.id, choice) });
}
