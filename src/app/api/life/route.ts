import { getSessionUser } from "@/lib/db/server";
import { getPool } from "@/lib/db/pool";
import { cleanAreas, isLifeStage } from "@/lib/domain/life";

export const dynamic = "force-dynamic";

/** Save life stage + life areas (what the person is doing now and where they want to grow). */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { stage?: unknown; areas?: unknown };
  if (!isLifeStage(body.stage)) return Response.json({ error: "Ek option chuno." }, { status: 400 });
  const areas = cleanAreas(body.areas);
  if (areas.length === 0) return Response.json({ error: "Kam se kam ek area chuno." }, { status: 400 });
  await getPool().query("update public.profiles set life_stage = $2, life_areas = $3 where id = $1", [user.id, body.stage, areas]);
  return Response.json({ ok: true, stage: body.stage, areas });
}
