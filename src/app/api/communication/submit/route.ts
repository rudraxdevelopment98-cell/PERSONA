import { z } from "zod";
import { generateStructured } from "@/lib/ai/client";
import { COMMUNICATION_EVAL_SYSTEM, userData } from "@/lib/ai/prompts";
import { communicationEvaluationSchema, rubricTotal } from "@/lib/ai/schemas";
import { EXERCISE_BY_ID } from "@/lib/domain/labs";
import { apiRoute, dbError, HttpError } from "@/lib/server/api";
import { buildAIContext } from "@/lib/server/context";
import { recomputeScores } from "@/lib/server/progress";
import type { ExerciseRow } from "@/lib/server/types";

export const maxDuration = 300;

const schema = z.object({
  id: z.uuid(),
  response: z.string().trim().min(10, "Write what you would actually say.").max(3000),
});

export const POST = apiRoute(schema, async ({ id, response }, { db, user, state }) => {
  const { data } = await db.from("exercise_completions").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  const ex = data as ExerciseRow | null;
  if (!ex) throw new HttpError(404, "Exercise not found.");
  if (ex.completed_at) throw new HttpError(409, "You have already answered this exercise.");
  const meta = EXERCISE_BY_ID.get(ex.exercise_type);

  const context = await buildAIContext(db, state, { checkins: 1 });
  const evaluation = await generateStructured({
    system: COMMUNICATION_EVAL_SYSTEM,
    prompt: `${context}

## Exercise: ${meta?.label ?? ex.exercise_type}
Setting: ${ex.prompt.setting}
Other person: ${ex.prompt.other_person}
They say: "${ex.prompt.they_say}"
User's goal: ${ex.prompt.your_goal}

${userData("user's reply", response)}

Evaluate the reply.`,
    schema: communicationEvaluationSchema,
    effort: "low",
  });
  const score = rubricTotal(evaluation.rubric);

  const { error } = await db
    .from("exercise_completions")
    .update({ response, evaluation, score, completed_at: new Date().toISOString() })
    .eq("id", ex.id);
  dbError(error);
  await recomputeScores(db, user.id, "communication_lab");
  return { evaluation, score };
});
