import { z } from "zod";
import { DEPTHS } from "@/lib/domain/assessment";
import { apiRoute, dbError, HttpError } from "@/lib/server/api";

const schema = z.object({ depth: z.enum(DEPTHS) });

/** Chooses (or changes) the length of the in-progress baseline. Answers carry over because the sets are nested. */
export const POST = apiRoute(schema, async ({ depth }, { db, user, state }) => {
  if (state.baseline) throw new HttpError(409, "Your baseline assessment is already complete.");
  const { data: existing } = await db
    .from("assessments")
    .select("id")
    .eq("user_id", user.id)
    .eq("kind", "baseline")
    .eq("status", "in_progress")
    .maybeSingle();
  if (existing) {
    const { error } = await db.from("assessments").update({ depth }).eq("id", existing.id);
    dbError(error);
    return { ok: true };
  }
  const res = await db.from("assessments").insert({ user_id: user.id, kind: "baseline", depth });
  if (res.error?.code === "23505") {
    // Created at the same moment by another request: just set its depth.
    const again = await db.from("assessments").update({ depth }).eq("user_id", user.id).eq("kind", "baseline").eq("status", "in_progress");
    dbError(again.error);
  } else dbError(res.error);
  return { ok: true };
});
