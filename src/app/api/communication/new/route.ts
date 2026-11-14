import { z } from "zod";
import { generateStructured } from "@/lib/ai/client";
import { COMMUNICATION_PROMPT_SYSTEM } from "@/lib/ai/prompts";
import { communicationPromptSchema } from "@/lib/ai/schemas";
import { COMMUNICATION_EXERCISES, EXERCISE_BY_ID } from "@/lib/domain/labs";
import { apiRoute, dbError, enforceHourlyLimit, requireBaseline } from "@/lib/server/api";
import { buildAIContext } from "@/lib/server/context";

export const maxDuration = 300;

const schema = z.object({ exercise_type: z.enum(COMMUNICATION_EXERCISES.map((e) => e.id) as [string, ...string[]]) });

export const POST = apiRoute(schema, async ({ exercise_type }, { db, user, state }) => {
  requireBaseline(state);
  await enforceHourlyLimit(db, user.id, "exercise_completions", 15);
  const ex = EXERCISE_BY_ID.get(exercise_type)!;

  const { data: recent } = await db
    .from("exercise_completions")
    .select("prompt")
    .eq("user_id", user.id)
    .eq("exercise_type", exercise_type)
    .order("created_at", { ascending: false })
    .limit(8);
  const context = await buildAIContext(db, state, { checkins: 2 });

  const prompt = await generateStructured({
    language: state.profile.language,
    system: COMMUNICATION_PROMPT_SYSTEM,
    prompt: `${context}\n\n## Exercise type\n${ex.label}: ${ex.description}\nAvoid repeating these recent situations:\n${(recent ?? []).map((r) => `- ${r.prompt?.title}`).join("\n") || "None"}\n\nCreate the exercise.`,
    schema: communicationPromptSchema,
    effort: "low",
  });

  const { data, error } = await db
    .from("exercise_completions")
    .insert({ user_id: user.id, exercise_type, skill: ex.skill, prompt })
    .select("id")
    .single();
  dbError(error);
  return { id: data!.id, prompt };
});
