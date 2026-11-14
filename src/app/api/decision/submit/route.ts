import { z } from "zod";
import { generateStructured } from "@/lib/ai/client";
import { DECISION_EVAL_SYSTEM, userData } from "@/lib/ai/prompts";
import { decisionEvaluationSchema, rubricTotal } from "@/lib/ai/schemas";
import { apiRoute, dbError, HttpError } from "@/lib/server/api";
import { buildAIContext } from "@/lib/server/context";
import { recomputeScores } from "@/lib/server/progress";
import type { DecisionLogRow } from "@/lib/server/types";

export const maxDuration = 300;

const schema = z.object({
  id: z.uuid(),
  chosen_option: z.string().max(4),
  reasoning: z.string().trim().min(20, "Explain your reasoning - this is what gets evaluated.").max(4000),
  confidence: z.number().int().min(1).max(10),
  first_choice_ms: z.number().int().min(0).max(86_400_000).nullable(),
  total_time_ms: z.number().int().min(0).max(86_400_000),
  choice_changes: z.number().int().min(0).max(100),
});

export const POST = apiRoute(schema, async (body, { db, user, state }) => {
  const { data } = await db.from("decision_logs").select("*").eq("id", body.id).eq("user_id", user.id).maybeSingle();
  const log = data as DecisionLogRow | null;
  if (!log) throw new HttpError(404, "Scenario not found.");
  if (log.completed_at) throw new HttpError(409, "You have already decided on this scenario.");
  const chosen = log.scenario.options.find((o) => o.id === body.chosen_option);
  if (!chosen) throw new HttpError(400, "Unknown option.");

  const context = await buildAIContext(db, state, { checkins: 1 });
  const prompt = `${context}

## Scenario (${log.category}, ${log.difficulty})
${log.scenario.title}
${log.scenario.context}
Stakes: ${log.scenario.stakes}
Constraints: ${log.scenario.constraints.join("; ")}
Options:
${log.scenario.options.map((o) => `${o.id}) ${o.text}`).join("\n")}

## User's decision
Chose: ${chosen.id}) ${chosen.text}
Stated confidence: ${body.confidence}/10
Time to first choice: ${body.first_choice_ms != null ? Math.round(body.first_choice_ms / 1000) + "s" : "n/a"}; total time: ${Math.round(body.total_time_ms / 1000)}s; changed choice ${body.choice_changes} time(s).
${userData("reasoning", body.reasoning)}

Evaluate how they decided.`;

  const evaluation = await generateStructured({ language: state.profile.language, system: DECISION_EVAL_SYSTEM, prompt, schema: decisionEvaluationSchema, effort: "medium" });
  const score = rubricTotal(evaluation.rubric);

  const { error } = await db
    .from("decision_logs")
    .update({
      chosen_option: chosen.id,
      reasoning: body.reasoning,
      confidence: body.confidence,
      first_choice_ms: body.first_choice_ms,
      total_time_ms: body.total_time_ms,
      choice_changes: body.choice_changes,
      evaluation,
      score,
      completed_at: new Date().toISOString(),
    })
    .eq("id", log.id);
  dbError(error);
  await recomputeScores(db, user.id, "decision_lab");
  return { evaluation, score };
});
