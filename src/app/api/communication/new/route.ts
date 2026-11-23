import { assertWithinLimit } from "@/lib/server/plan";
import { ARENAS, TWISTS } from "@/lib/domain/variety";
import { arenasFor } from "@/lib/domain/life";
import { z } from "zod";
import { generateStructured } from "@/lib/ai/client";
import { COMMUNICATION_PROMPT_SYSTEM } from "@/lib/ai/prompts";
import { communicationPromptSchema } from "@/lib/ai/schemas";
import { COMMUNICATION_EXERCISES, EXERCISE_BY_ID } from "@/lib/domain/labs";
import { apiRoute, dbError, enforceHourlyLimit, requireBaseline } from "@/lib/server/api";
import { buildAIContext } from "@/lib/server/context";

export const maxDuration = 300;

const schema = z.object({ exercise_type: z.enum(COMMUNICATION_EXERCISES.map((e) => e.id) as [string, ...string[]]) });

const pickArena = (allowed: string[]) => {
  const pool = ARENAS.filter((a) => allowed.includes(a.id));
  return pool[Math.floor(Math.random() * pool.length)];
};

export const POST = apiRoute(schema, async ({ exercise_type }, { db, user, state }) => {
  await assertWithinLimit(user.id, "communication");
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
  const context = await buildAIContext(db, state, { checkins: 2, lean: true, abstract: true });
  const twist = TWISTS[Math.floor(Math.random() * TWISTS.length)];

  const arena = pickArena(arenasFor(state.profile.life_areas ?? [], state.profile.life_stage));
  const prompt = await generateStructured({
    language: state.profile.language,
    system: COMMUNICATION_PROMPT_SYSTEM,
    prompt: `${context}\n\n## Exercise type\n${ex.label}: ${ex.description}\nAvoid repeating these recent situations:\n${(recent ?? []).map((r) => `- ${r.prompt?.title}`).join("\n") || "None"}\nSet it in this life area: ${arena.detail}. Twist: ${twist.label} - ${twist.detail}. Give the other person a name and a real personality. Use the user's data to choose which behaviour to train, but never reuse their literal situation, workplace or people.\n\nCreate the exercise.`,
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
