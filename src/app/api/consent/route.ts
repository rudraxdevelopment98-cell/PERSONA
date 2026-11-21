import { getSessionUser } from "@/lib/db/server";
import { acceptLegal } from "@/lib/server/legal";

export const dynamic = "force-dynamic";

/** The signed-in person agrees to the current Terms + Privacy Policy and confirms they are 18+. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { agree?: unknown };
  if (body.agree !== true) return Response.json({ error: "Please tick the box to continue." }, { status: 400 });
  await acceptLegal(user.id);
  return Response.json({ ok: true });
}
