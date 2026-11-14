import { z } from "zod";
import { AIError, generateStructured } from "@/lib/ai/client";
import { CHECKIN_ANALYSIS_SYSTEM, userData } from "@/lib/ai/prompts";
import { checkinAnalysisSchema } from "@/lib/ai/schemas";
import { apiRoute, dbError, HttpError } from "@/lib/server/api";
import { buildAIContext } from "@/lib/server/context";
import { recomputeScores } from "@/lib/server/progress";
import type { CheckinRow } from "@/lib/server/types";

export const maxDuration = 300;

const schema = z.object({
  answers: z
    .array(z.object({ id: z.string().max(8), value: z.union([z.string().trim().max(2000), z.number().int().min(1).max(10)]) }))
    .max(7),
});

export const POST = apiRoute(schema, async ({ answers }, { db, user, state }) => {
  const { data } = await db.from("daily_checkins").select("*").eq("user_id", user.id).eq("checkin_date", state.today).maybeSingle();
  const checkin = data as CheckinRow | null;
  if (!checkin) throw new HttpError(404, "Start today's check-in first.");
  if (checkin.completed_at) throw new HttpError(409, "Today's check-in is already complete.");

  // Validate each answer against its question.
  const clean: { id: string; value: string | number }[] = [];
  for (const q of checkin.questions) {
    const a = answers.find((x) => x.id === q.id);
    if (!a || a.value === "") throw new HttpError(400, "Please answer every question.");
    if (q.type === "scale" && (typeof a.value !== "number" || a.value < 1 || a.value > 10)) throw new HttpError(400, "Scale answers must be 1-10.");
    if (q.type === "choice" && !(q.options ?? []).includes(String(a.value))) throw new HttpError(400, "Please pick one of the options.");
    if (q.type === "text" && String(a.value).length < 2) throw new HttpError(400, "Please write a short answer.");
    clean.push({ id: q.id, value: a.value });
  }

  const completedAt = new Date().toISOString();
  const save = await db.from("daily_checkins").update({ answers: clean, completed_at: completedAt }).eq("id", checkin.id);
  dbError(save.error);

  let analysis = null;
  let analysisError: string | null = null;
  try {
    const context = await buildAIContext(db, state, { checkins: 6 });
    const today = checkin.questions.map((q) => `Q: ${q.text}\nA: ${clean.find((c) => c.id === q.id)?.value}`).join("\n");
    analysis = await generateStructured({
      language: state.profile.language,
      system: CHECKIN_ANALYSIS_SYSTEM,
      prompt: `${context}\n\n## Today's check-in (day ${checkin.day_number})\n${userData("today's answers", today)}\n\nAnalyse today's check-in.`,
      schema: checkinAnalysisSchema,
      effort: "low",
    });
    const upd = await db.from("daily_checkins").update({ analysis }).eq("id", checkin.id);
    dbError(upd.error);
  } catch (err) {
    if (!(err instanceof AIError)) throw err;
    analysisError = err.message;
  }

  await recomputeScores(db, user.id, "checkin");
  return { analysis, analysisError };
});
