import { z } from "zod";
import { generateStructured } from "@/lib/ai/client";
import { SCENARIO_EVAL_SYSTEM, userData } from "@/lib/ai/prompts";
import { rubricTotal, scenarioEvaluationSchema } from "@/lib/ai/schemas";
import { apiRoute, dbError, HttpError } from "@/lib/server/api";
import { buildAIContext } from "@/lib/server/context";
import { recomputeScores } from "@/lib/server/progress";
import type { SessionRow } from "@/lib/server/types";

export const maxDuration = 120;

const schema = z.object({
  session_id: z.uuid(),
  index: z.number().int().min(0).max(2),
  choice_id: z.string().max(4),
  reasoning: z.string().trim().min(15, "Explain your reasoning in at least a sentence.").max(4000),
  response_time_ms: z.number().int().min(0).max(3_600_000).nullable(),
});

export const POST = apiRoute(schema, async (body, { supabase, user, state }) => {
  const { data } = await supabase.from("daily_sessions").select("*").eq("id", body.session_id).eq("user_id", user.id).maybeSingle();
  const session = data as SessionRow | null;
  if (!session) throw new HttpError(404, "Session not found.");
  if (!session.story_completed_at) throw new HttpError(409, "Finish reading the story first.");

  const scenario = session.scenarios[body.index];
  if (!scenario) throw new HttpError(400, "Unknown scenario.");
  const chosen = scenario.options.find((o) => o.id === body.choice_id);
  if (!chosen) throw new HttpError(400, "Unknown option.");

  const { data: prior } = await supabase
    .from("scenario_responses")
    .select("id")
    .eq("session_id", session.id)
    .eq("scenario_index", body.index)
    .maybeSingle();
  if (prior) throw new HttpError(409, "You have already answered this scenario.");

  const context = await buildAIContext(supabase, state, { checkins: 2 });
  const prompt = `${context}

## Scenario
${scenario.title}
${scenario.situation}
Question: ${scenario.question}
Options:
${scenario.options.map((o) => `${o.id}) ${o.text} [author's rating: ${o.quality}]`).join("\n")}

## User's response
Chose: ${chosen.id}) ${chosen.text}
${userData("reasoning", body.reasoning)}
Time taken: ${body.response_time_ms != null ? Math.round(body.response_time_ms / 1000) + "s" : "unknown"}

Evaluate the reasoning.`;

  const evaluation = await generateStructured({ system: SCENARIO_EVAL_SYSTEM, prompt, schema: scenarioEvaluationSchema, effort: "low" });
  const score = rubricTotal(evaluation.rubric);

  const ins = await supabase.from("scenario_responses").insert({
    user_id: user.id,
    session_id: session.id,
    scenario_index: body.index,
    skill: scenario.skill,
    choice_id: chosen.id,
    reasoning: body.reasoning,
    response_time_ms: body.response_time_ms,
    evaluation,
    score,
  });
  if (ins.error?.code === "23505") throw new HttpError(409, "You have already answered this scenario.");
  dbError(ins.error);

  const { count } = await supabase.from("scenario_responses").select("id", { count: "exact", head: true }).eq("session_id", session.id);
  if ((count ?? 0) >= session.scenarios.length && !session.scenarios_completed_at) {
    await supabase.from("daily_sessions").update({ scenarios_completed_at: new Date().toISOString() }).eq("id", session.id);
  }
  await recomputeScores(supabase, user.id, "scenario");

  return { evaluation, score, options: scenario.options };
});
