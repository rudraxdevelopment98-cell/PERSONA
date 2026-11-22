import { getSessionUser } from "@/lib/db/server";
import { logError } from "@/lib/server/errors";

export const dynamic = "force-dynamic";

/** Browser error reports (page crashes, unhandled errors). Short message + page path only. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { message?: unknown; path?: unknown };
  const message = typeof body.message === "string" ? body.message.slice(0, 400) : "";
  const path = typeof body.path === "string" ? body.path.slice(0, 200) : "/";
  if (!message) return Response.json({ ok: false }, { status: 400 });
  const user = await getSessionUser().catch(() => null);
  await logError("client", path, new Error(message), user?.id ?? null);
  return Response.json({ ok: true });
}
