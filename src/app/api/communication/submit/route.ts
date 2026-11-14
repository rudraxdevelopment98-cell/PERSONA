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

const speechSchema = z.object({
  duration_ms: z.number().int().min(0).max(600_000),
  word_count: z.number().int().min(0).max(5000),
  wpm: z.number().min(0).max(400),
  filler_count: z.number().int().min(0).max(1000),
  fillers: z.record(z.string().max(20), z.number().int().min(0).max(1000)),
  longest_pause_ms: z.number().int().min(0).max(600_000),
});

const schema = z.object({
  id: z.uuid(),
  response: z.string().trim().min(10, "Write or say what you would actually say.").max(3000),
  input_mode: z.enum(["text", "voice"]).default("text"),
  speech: speechSchema.nullable().default(null),
});

export const POST = apiRoute(schema, async ({ id, response, input_mode, speech }, { db, user, state }) => {
  const { data } = await db.from("exercise_completions").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  const ex = data as ExerciseRow | null;
  if (!ex) throw new HttpError(404, "Exercise not found.");
  if (ex.completed_at) throw new HttpError(409, "You have already answered this exercise.");
  const meta = EXERCISE_BY_ID.get(ex.exercise_type);

  const context = await buildAIContext(db, state, { checkins: 1 });
  const evaluation = await generateStructured({
    language: state.profile.language,
    system: COMMUNICATION_EVAL_SYSTEM,
    prompt: `${context}

## Exercise: ${meta?.label ?? ex.exercise_type}
Setting: ${ex.prompt.setting}
Other person: ${ex.prompt.other_person}
They say: "${ex.prompt.they_say}"
User's goal: ${ex.prompt.your_goal}

${userData(input_mode === "voice" ? "user's spoken reply (speech-to-text transcript)" : "user's reply", response)}
${
  input_mode === "voice" && speech
    ? `
## Speaking metrics (measured in the browser)
Duration: ${Math.round(speech.duration_ms / 1000)} s; ${speech.word_count} words; ${Math.round(speech.wpm)} words per minute (comfortable conversational pace is roughly 120-160).
Filler words: ${speech.filler_count} (${Object.entries(speech.fillers).map(([w, n]) => `${w} x${n}`).join(", ") || "none"}).
Longest pause: ${(speech.longest_pause_ms / 1000).toFixed(1)} s.
The transcript may contain recognition errors; judge intent, and give delivery_feedback on pace, fillers and pauses.`
    : "The reply was typed; set delivery_feedback to an empty string."
}

Evaluate the reply.`,
    schema: communicationEvaluationSchema,
    effort: "low",
  });
  const score = rubricTotal(evaluation.rubric);

  const { error } = await db
    .from("exercise_completions")
    .update({ response, evaluation, score, input_mode, speech: input_mode === "voice" ? speech : null, completed_at: new Date().toISOString() })
    .eq("id", ex.id);
  dbError(error);
  await recomputeScores(db, user.id, "communication_lab");
  return { evaluation, score };
});
