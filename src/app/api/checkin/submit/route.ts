import { z } from "zod";
import { AIError, generateStructured } from "@/lib/ai/client";
import { CHECKIN_ANALYSIS_SYSTEM, userData } from "@/lib/ai/prompts";
import { checkinAnalysisSchema } from "@/lib/ai/schemas";
import { apiRoute, dbError, HttpError } from "@/lib/server/api";
import { buildAIContext } from "@/lib/server/context";
import { recomputeScores } from "@/lib/server/progress";
import type { CheckinRow } from "@/lib/server/types";
import { MOMENT_TAG_IDS, momentTagLabel } from "@/lib/domain/moment";
import { episodeAllowance } from "@/lib/server/plan";

export const maxDuration = 300;

const schema = z.object({
  answers: z
    .array(z.object({ id: z.string().max(8), value: z.union([z.string().trim().max(2000), z.number().int().min(1).max(10)]) }))
    .max(7),
  /** Optional: what happened today, in the user's words. Skipping is always fine. */
  today: z
    .object({
      note: z.string().trim().max(2000).optional(),
      tags: z.array(z.enum(MOMENT_TAG_IDS)).max(8).optional(),
      skipped: z.boolean().optional(),
    })
    .optional(),
});

export const POST = apiRoute(schema, async ({ answers, today: moment }, { db, user, state }) => {
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
  const note = moment?.skipped ? null : moment?.note?.trim() || null;
  const tags = moment?.skipped ? [] : [...new Set(moment?.tags ?? [])];
  const save = await db
    .from("daily_checkins")
    .update({ answers: clean, completed_at: completedAt, today_note: note, today_tags: tags, today_skipped: Boolean(moment?.skipped) || (!note && !tags.length) })
    .eq("id", checkin.id);
  dbError(save.error);

  let analysis = null;
  let analysisError: string | null = null;
  try {
    const context = await buildAIContext(db, state, { checkins: 4, lean: true });
    const qa = checkin.questions.map((q) => `Q: ${q.text}\nA: ${clean.find((c) => c.id === q.id)?.value}`).join("\n");
    const shared = [tags.length ? `Today was about: ${tags.map(momentTagLabel).join(", ")}` : "", note ? `What happened today: ${note}` : ""].filter(Boolean).join("\n");
    const today = shared ? `${qa}\n${shared}` : qa;
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

  // Free plan: on a lite day the check-in alone keeps the streak, and no episode is written.
  const { data: hasSession } = await db.from("daily_sessions").select("id").eq("user_id", user.id).eq("day_number", checkin.day_number).maybeSingle();
  const allowance = hasSession ? null : await episodeAllowance(user.id, checkin.day_number);
  if (allowance?.lite) await db.from("daily_checkins").update({ lite: true }).eq("id", checkin.id);

  await recomputeScores(db, user.id, "checkin");
  return { analysis, analysisError, lite: allowance?.lite ? allowance : null };
});
