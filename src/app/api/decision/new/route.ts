import { z } from "zod";
import { generateStructured } from "@/lib/ai/client";
import { DECISION_SCENARIO_SYSTEM } from "@/lib/ai/prompts";
import { decisionScenarioSchema } from "@/lib/ai/schemas";
import { DECISION_CATEGORIES, DECISION_DIFFICULTIES } from "@/lib/domain/labs";
import { apiRoute, dbError, enforceHourlyLimit, HttpError, requireBaseline } from "@/lib/server/api";
import { buildAIContext } from "@/lib/server/context";

export const maxDuration = 300;

const schema = z.object({
  category: z.enum(DECISION_CATEGORIES.map((c) => c.id) as [string, ...string[]]),
  difficulty: z.enum(DECISION_DIFFICULTIES.map((d) => d.id) as [string, ...string[]]),
});

export const POST = apiRoute(schema, async ({ category, difficulty }, { db, user, state }) => {
  requireBaseline(state);
  await enforceHourlyLimit(db, user.id, "decision_logs", 12);

  const { data: recent } = await db.from("decision_logs").select("scenario").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
  const used = (recent ?? []).map((r) => `- ${r.scenario?.title}`).join("\n");
  const context = await buildAIContext(db, state, { checkins: 2 });
  const cat = DECISION_CATEGORIES.find((c) => c.id === category)!.label;
  const diff = DECISION_DIFFICULTIES.find((d) => d.id === difficulty)!.label;

  const scenario = await generateStructured({
    system: DECISION_SCENARIO_SYSTEM,
    prompt: `${context}\n\n## Request\nCategory: ${cat}\nDifficulty: ${diff}\nAvoid these recent scenarios:\n${used || "None"}\n\nCreate the scenario.`,
    schema: decisionScenarioSchema,
    effort: "low",
  });
  const ids = ["a", "b", "c", "d"];
  scenario.options = scenario.options.slice(0, 4).map((o, i) => ({ ...o, id: ids[i] }));
  if (scenario.options.length < 2) throw new HttpError(502, "The scenario was incomplete. Please try again.");

  const { data, error } = await db
    .from("decision_logs")
    .insert({ user_id: user.id, category, difficulty, scenario })
    .select("id")
    .single();
  dbError(error);
  return { id: data!.id, scenario };
});
