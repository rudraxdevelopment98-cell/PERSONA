import { z } from "zod";
import { generateStructured } from "@/lib/ai/client";
import { CHECKIN_QUESTIONS_SYSTEM } from "@/lib/ai/prompts";
import { checkinQuestionsSchema, type CheckinQuestion } from "@/lib/ai/schemas";
import { DIMENSION_META } from "@/lib/domain/dimensions";
import { apiRoute, dbError, HttpError, requireBaseline } from "@/lib/server/api";
import { buildAIContext } from "@/lib/server/context";
import { todaysFocus } from "@/lib/server/state";

export const maxDuration = 120;

function normalise(questions: CheckinQuestion[]): CheckinQuestion[] {
  return questions.slice(0, 7).map((q, i) => ({
    ...q,
    id: `q${i + 1}`,
    options: q.type === "choice" ? (q.options ?? []).slice(0, 5) : null,
    scale_low_label: q.type === "scale" ? (q.scale_low_label ?? "Not at all") : null,
    scale_high_label: q.type === "scale" ? (q.scale_high_label ?? "Completely") : null,
  }));
}

/** Returns today's check-in, generating adaptive questions on first request. */
export const POST = apiRoute(z.object({}), async (_body, { supabase, user, state }) => {
  requireBaseline(state);
  if (state.day < 1) throw new HttpError(409, "Your programme has not started yet.");

  const { data: existing } = await supabase
    .from("daily_checkins")
    .select("*")
    .eq("user_id", user.id)
    .eq("checkin_date", state.today)
    .maybeSingle();
  if (existing) return { checkin: existing };

  const focus = todaysFocus(state);
  const context = await buildAIContext(supabase, state, { checkins: 3 });
  const prompt = `${context}\n\nToday is day ${state.day}. Today's learning focus is "${focus.title}" (${DIMENSION_META[focus.dimension].label}). Write today's check-in questions.`;

  let questions: CheckinQuestion[] = [];
  for (let attempt = 0; attempt < 2 && questions.length < 5; attempt++) {
    const out = await generateStructured({ system: CHECKIN_QUESTIONS_SYSTEM, prompt, schema: checkinQuestionsSchema, effort: "low" });
    questions = normalise(out.questions);
  }
  if (questions.length < 5) throw new HttpError(502, "Could not prepare today's questions. Please try again.");

  const { data, error } = await supabase
    .from("daily_checkins")
    .upsert(
      { user_id: user.id, day_number: state.day, checkin_date: state.today, questions },
      { onConflict: "user_id,checkin_date", ignoreDuplicates: true },
    )
    .select("*")
    .maybeSingle();
  dbError(error);
  if (data) return { checkin: data };
  // A concurrent request created it first.
  const again = await supabase.from("daily_checkins").select("*").eq("user_id", user.id).eq("checkin_date", state.today).single();
  dbError(again.error);
  return { checkin: again.data };
});
