import { z } from "zod";
import { AIError } from "@/lib/ai/client";
import { DEPTHS, isCompleteForDepth, scoreAssessment } from "@/lib/domain/assessment";
import { DIMENSIONS, type Dimension } from "@/lib/domain/dimensions";
import { apiRoute, dbError, HttpError } from "@/lib/server/api";
import { upgradeOptions } from "@/lib/server/assessment";
import { generateDevelopmentProfile } from "@/lib/server/profile";
import { recomputeScores } from "@/lib/server/progress";

export const maxDuration = 300;

const schema = z.object({ depth: z.enum(DEPTHS), held_back: z.string().trim().max(2000).optional() });

/**
 * Moves a quick/standard baseline to a deeper level once the extra questions are
 * answered. Only allowed in the first days, so later growth is still measured
 * against an honest starting point.
 */
export const POST = apiRoute(schema, async ({ depth, held_back }, { db, user, state }) => {
  const baseline = state.baseline;
  if (!baseline) throw new HttpError(409, "Finish your assessment first.");
  if (!upgradeOptions(state).includes(depth)) throw new HttpError(409, "Your starting point is already locked in.");

  const { data: responses } = await db.from("assessment_responses").select("question_id, value").eq("assessment_id", baseline.id);
  const answers = responses ?? [];
  if (!isCompleteForDepth(answers, depth)) throw new HttpError(400, "Please answer every question before finishing.");

  const raw = scoreAssessment(answers);
  const scores = Object.fromEntries(DIMENSIONS.map((d) => [d, raw[d] ?? 0])) as Record<Dimension, number>;
  const reflections = { goal: baseline.reflections?.goal ?? "", held_back: held_back && held_back.length >= 10 ? held_back : (baseline.reflections?.held_back ?? "") };

  const upd = await db.from("assessments").update({ depth, scores, reflections }).eq("id", baseline.id);
  dbError(upd.error);
  for (const d of DIMENSIONS) {
    const r = await db
      .from("skill_progress")
      .update({ baseline: scores[d], explanation: `Baseline from your ${depth} assessment: ${scores[d]}.` })
      .eq("user_id", user.id)
      .eq("dimension", d);
    dbError(r.error);
  }
  await recomputeScores(db, user.id, "baseline");

  try {
    const profile = await generateDevelopmentProfile(db, user.id, scores, reflections, state.profile.language, depth);
    return { scores, profile };
  } catch (err) {
    if (err instanceof AIError) return { scores, profile: null, profileError: err.message };
    throw err;
  }
});
