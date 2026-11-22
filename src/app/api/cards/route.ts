import { getSessionUser } from "@/lib/db/server";
import { CARDS_PER_DAY } from "@/lib/domain/cards";
import { answerCard } from "@/lib/server/cards";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Answer one of today's quick cards (first answer counts) and get the reveal. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { idx?: unknown; choice?: unknown };
  const idx = Number(body.idx);
  if (!Number.isInteger(idx) || idx < 0 || idx >= CARDS_PER_DAY || (body.choice !== "a" && body.choice !== "b")) {
    return Response.json({ error: "Pick A or B." }, { status: 400 });
  }
  return Response.json({ answer: await answerCard(user.id, idx, body.choice) });
}
