import { z } from "zod";
import { apiRoute, dbError, HttpError } from "@/lib/server/api";
import { ITEMS_BY_ID } from "@/lib/domain/assessment";
import { upgradeOptions } from "@/lib/server/assessment";

const schema = z.object({ question_id: z.string().max(32), value: z.number().int().min(1).max(5) });

/**
 * Saves one answer to the user's in-progress baseline (creating it if needed),
 * or - while "going deeper" is still allowed - to their completed quick/standard baseline.
 */
export const POST = apiRoute(schema, async ({ question_id, value }, { db, user, state }) => {
  const item = ITEMS_BY_ID.get(question_id);
  if (!item) throw new HttpError(400, "Unknown question.");
  if (item.kind === "situational" && !item.options.some((o) => o.value === value)) throw new HttpError(400, "Invalid option.");

  let assessmentId: string | undefined;
  if (state.baseline) {
    if (upgradeOptions(state).length === 0) throw new HttpError(409, "Your baseline assessment is already complete.");
    // Earlier answers are kept as they were; only new questions can be added.
    const { data: prior } = await db.from("assessment_responses").select("id").eq("assessment_id", state.baseline.id).eq("question_id", question_id).maybeSingle();
    if (prior) return { ok: true };
    assessmentId = state.baseline.id;
  } else {
    const findInProgress = () =>
      db.from("assessments").select("id").eq("user_id", user.id).eq("kind", "baseline").eq("status", "in_progress").maybeSingle();
    let { data: assessment } = await findInProgress();
    if (!assessment) {
      const res = await db.from("assessments").insert({ user_id: user.id, kind: "baseline" }).select("id").single();
      if (res.error?.code === "23505") {
        // Another answer created it at the same moment - use that one.
        assessment = (await findInProgress()).data;
      } else {
        dbError(res.error);
        assessment = res.data;
      }
    }
    assessmentId = assessment?.id;
  }
  if (!assessmentId) throw new HttpError(500, "Could not save your answer. Please try again.");

  const { error } = await db
    .from("assessment_responses")
    .upsert({ assessment_id: assessmentId, user_id: user.id, question_id, dimension: item.dimension, value }, { onConflict: "assessment_id,question_id" });
  dbError(error);
  return { ok: true };
});
