import { z } from "zod";
import { generateStructured } from "@/lib/ai/client";
import { SESSION_SYSTEM } from "@/lib/ai/prompts";
import { dailySessionSchema } from "@/lib/ai/schemas";
import { DIMENSION_META } from "@/lib/domain/dimensions";
import { apiRoute, dbError, HttpError, requireBaseline } from "@/lib/server/api";
import { buildAIContext } from "@/lib/server/context";
import { todaysFocus } from "@/lib/server/state";

export const maxDuration = 300;

const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Generates today's personalised 30-minute session (once per programme day). */
export const POST = apiRoute(z.object({}), async (_body, { supabase, user, state }) => {
  requireBaseline(state);
  if (state.day < 1) throw new HttpError(409, "Your programme has not started yet.");

  const { data: existing } = await supabase.from("daily_sessions").select("id").eq("user_id", user.id).eq("day_number", state.day).maybeSingle();
  if (existing) return { sessionId: existing.id };

  const { data: checkin } = await supabase
    .from("daily_checkins")
    .select("completed_at")
    .eq("user_id", user.id)
    .eq("checkin_date", state.today)
    .maybeSingle();
  if (!checkin?.completed_at) throw new HttpError(409, "Complete today's check-in first - your session is built from it.");

  const { data: pastStories } = await supabase
    .from("generated_stories")
    .select("title, body")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(12);

  const focus = todaysFocus(state);
  const context = await buildAIContext(supabase, state, { checkins: 3 });
  const used = (pastStories ?? []).map((s) => `- "${s.title}": ${s.body.slice(0, 160).replace(/\s+/g, " ")}…`).join("\n");
  const prompt = `${context}

## Today
Day ${focus.day} of 90, Phase ${focus.phase.number} (${focus.phase.name}).
Focus: ${focus.title} - train ${DIMENSION_META[focus.dimension].label} (${focus.dimension}).${focus.personalised ? " This is a personalised day targeting one of the user's weakest areas." : ""}
Set every scenario's "skill" to "${focus.dimension}" unless a scenario clearly trains a different dimension.

## Stories already used (do not repeat themes, settings or names)
${used || "None yet."}

Write today's session.`;

  const content = await generateStructured({ system: SESSION_SYSTEM, prompt, schema: dailySessionSchema, effort: "medium", maxTokens: 32000 });

  const ids = ["a", "b", "c", "d"];
  const scenarios = content.scenarios.slice(0, 3).map((s) => ({
    ...s,
    options: s.options.slice(0, 4).map((o, i) => ({ ...o, id: ids[i] })),
  }));
  if (scenarios.length < 3 || scenarios.some((s) => s.options.length < 3)) throw new HttpError(502, "The session was incomplete. Please try again.");
  const reflection = content.reflection_questions.slice(0, 3);

  const { data: session, error } = await supabase
    .from("daily_sessions")
    .insert({
      user_id: user.id,
      day_number: state.day,
      session_date: state.today,
      focus_skill: focus.dimension,
      introduction: { ...content.introduction, focus_title: focus.title },
      scenarios,
      challenge: content.challenge,
      reflection_questions: reflection,
    })
    .select("id")
    .single();
  if (error?.code === "23505") {
    const { data } = await supabase.from("daily_sessions").select("id").eq("user_id", user.id).eq("day_number", state.day).single();
    return { sessionId: data!.id };
  }
  dbError(error);

  const story = await supabase.from("generated_stories").insert({
    user_id: user.id,
    session_id: session!.id,
    title: content.story.title,
    body: content.story.body.trim(),
    word_count: countWords(content.story.body),
    insights: content.story.insights,
    target_skills: [focus.dimension],
  });
  dbError(story.error);
  return { sessionId: session!.id };
});
