import { z } from "zod";
import { generateStructured } from "@/lib/ai/client";
import { CHECKIN_QUESTIONS_SYSTEM } from "@/lib/ai/prompts";
import { checkinQuestionsSchema, type CheckinQuestion } from "@/lib/ai/schemas";
import { DIMENSION_META } from "@/lib/domain/dimensions";
import { apiRoute, dbError, HttpError, requireBaseline } from "@/lib/server/api";
import { buildAIContext } from "@/lib/server/context";
import { todaysFocus } from "@/lib/server/state";
import { CHECKIN_LENSES, byId, checkinLens } from "@/lib/domain/variety";

export const maxDuration = 300;

/** The always-present mood meter, in the person's language (used if the AI didn't add one). */
const METER: Record<string, [string, string, string]> = {
  en: ["Where is your confidence today?", "Very low", "Full of energy"],
  hinglish: ["Aaj ka confidence meter kahan hai?", "Bilkul low", "Full josh"],
  hi: ["आज आपका आत्मविश्वास कहाँ है?", "बिल्कुल कम", "पूरे जोश में"],
  gu: ["આજે તમારો આત્મવિશ્વાસ ક્યાં છે?", "બિલકુલ ઓછો", "પૂરા જોશમાં"],
};

function normalise(questions: CheckinQuestion[], language: string): CheckinQuestion[] {
  const [meterText, meterLow, meterHigh] = METER[language] ?? METER.en;
  // The mood meter (scale) always opens the deck; it feeds the confidence score, so add one if missing.
  const scale = questions.find((q) => q.type === "scale") ?? {
    id: "q0",
    text: meterText,
    type: "scale" as const,
    dimension: "confidence" as const,
    scale_low_label: meterLow,
    scale_high_label: meterHigh,
    options: null,
    style: "emoji" as const,
    purpose: "Daily confidence rating",
  };
  const ordered = [scale, ...questions.filter((q) => q !== scale)].slice(0, 6);
  return ordered.map((q, i) => ({
    ...q,
    id: `q${i + 1}`,
    options: q.type === "choice" ? (q.options ?? []).slice(0, q.style === "this_or_that" ? 2 : 5) : null,
    style: q.type === "scale" ? "emoji" : q.type === "text" || !q.style || q.style === "emoji" ? "normal" : q.style,
    scale_low_label: q.type === "scale" ? (q.scale_low_label ?? meterLow) : null,
    scale_high_label: q.type === "scale" ? (q.scale_high_label ?? meterHigh) : null,
  }));
}

/** Returns today's check-in, generating adaptive questions on first request. */
export const POST = apiRoute(z.object({}), async (_body, { db, user, state }) => {
  requireBaseline(state);
  if (state.day < 1) throw new HttpError(409, "Your programme has not started yet.");

  const { data: existing } = await db
    .from("daily_checkins")
    .select("*")
    .eq("user_id", user.id)
    .eq("checkin_date", state.today)
    .maybeSingle();
  if (existing) return { checkin: existing };

  const focus = todaysFocus(state);
  const context = await buildAIContext(db, state, { checkins: 3, abstract: true });
  const { data: recentRows } = await db
    .from("daily_checkins")
    .select("questions, lens")
    .eq("user_id", user.id)
    .order("checkin_date", { ascending: false })
    .limit(5);
  const recent = (recentRows ?? []) as { questions: CheckinQuestion[] | null; lens: string | null }[];
  const lensId = checkinLens(user.id, state.day, recent.slice(0, 3).map((r) => r.lens).filter(Boolean) as string[]);
  const lens = byId(CHECKIN_LENSES, lensId)!;
  const asked = recent.flatMap((r) => (r.questions ?? []).map((q) => `- ${q.text}`)).slice(0, 30);
  const prompt = `${context}

Today is day ${state.day}. Today's learning focus is "${focus.title}" (${DIMENSION_META[focus.dimension].label}).
Today's LENS: "${lens.label}" - ${lens.detail}.

## Recently asked (do not repeat or paraphrase)
${asked.join("\n") || "None yet."}

Write today's check-in questions.`;

  let questions: CheckinQuestion[] = [];
  for (let attempt = 0; attempt < 2 && questions.length < 3; attempt++) {
    const out = await generateStructured({ language: state.profile.language, system: CHECKIN_QUESTIONS_SYSTEM, prompt, schema: checkinQuestionsSchema, effort: "low" });
    questions = normalise(out.questions, state.profile.language);
  }
  if (questions.length < 3) throw new HttpError(502, "Could not prepare today's questions. Please try again.");

  const { data, error } = await db
    .from("daily_checkins")
    .upsert(
      { user_id: user.id, day_number: state.day, checkin_date: state.today, questions, lens: lensId },
      { onConflict: "user_id,checkin_date", ignoreDuplicates: true },
    )
    .select("*")
    .maybeSingle();
  dbError(error);
  if (data) return { checkin: data };
  // A concurrent request created it first.
  const again = await db.from("daily_checkins").select("*").eq("user_id", user.id).eq("checkin_date", state.today).single();
  dbError(again.error);
  return { checkin: again.data };
});
