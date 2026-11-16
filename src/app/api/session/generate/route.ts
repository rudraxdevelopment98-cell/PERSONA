import { z } from "zod";
import { AIError, generateStructured } from "@/lib/ai/client";
import { SESSION_SYSTEM, STORY_EXPANSION_SYSTEM, STORY_PART1_SYSTEM, STORY_PART2_SYSTEM } from "@/lib/ai/prompts";
import { dailySessionSchema, storyExpansionSchema, storyPartSchema, storySchema } from "@/lib/ai/schemas";
import { DIMENSION_META } from "@/lib/domain/dimensions";
import { apiRoute, dbError, HttpError, requireBaseline } from "@/lib/server/api";
import { buildAIContext } from "@/lib/server/context";
import { todaysFocus } from "@/lib/server/state";
import { planDay, recipeText } from "@/lib/server/variety";
import { getPlan } from "@/lib/server/plan";
import { SCENARIO_FORMATS, byId } from "@/lib/domain/variety";

export const maxDuration = 300;

const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Generates today's personalised 30-minute session (once per programme day). */
export const POST = apiRoute(z.object({}), async (_body, { db, user, state }) => {
  requireBaseline(state);
  if (state.day < 1) throw new HttpError(409, "Your programme has not started yet.");

  const { data: existing } = await db.from("daily_sessions").select("id").eq("user_id", user.id).eq("day_number", state.day).maybeSingle();
  if (existing) return { sessionId: existing.id };

  const { data: checkin } = await db
    .from("daily_checkins")
    .select("completed_at")
    .eq("user_id", user.id)
    .eq("checkin_date", state.today)
    .maybeSingle();
  if (!checkin?.completed_at) throw new HttpError(409, "Complete today's check-in first - your session is built from it.");

  const { data: pastStories } = await db
    .from("generated_stories")
    .select("title, body")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(12);

  const focus = todaysFocus(state);
  // Free users (on the app's AI) get a ~1,000-word episode; Pro and own-key users ~1,500.
  const short = !(await getPlan(user.id)).unlimitedAI;
  const words = short ? { range: "450-550", min: "450" } : { range: "650-800", min: "650" };
  const sized = (sys: string) => sys.replaceAll("650-800 words (never fewer than 650)", `${words.range} words (never fewer than ${words.min})`);
  const context = await buildAIContext(db, state, { checkins: 3 });
  const plan = await planDay(db, user.id, state.day, state.profile.next_world ?? null);
  const v = plan.variety;
  const used = (pastStories ?? []).map((s) => `- "${s.title}": ${s.body.slice(0, 120).replace(/\s+/g, " ")}…`).join("\n");
  const prompt = `${context}

## Today
Day ${focus.day} of 90, Phase ${focus.phase.number} (${focus.phase.name}).
Focus: ${focus.title} - train ${DIMENSION_META[focus.dimension].label} (${focus.dimension}).${focus.personalised ? " This is a personalised day targeting one of the user's weakest areas." : ""}
Set every scenario's "skill" to "${focus.dimension}" unless a scenario clearly trains a different dimension.

${recipeText(v, plan.previously)}

## Already used (do not repeat)
Earlier stories (other seasons - avoid their plots and names):
${used || "None yet."}
Recent challenges: ${plan.usedChallenges.join("; ") || "none"}
Recent scenarios: ${plan.usedScenarios.join("; ") || "none"}

Plan today's session.`;

  const content = await generateStructured({ language: state.profile.language, system: SESSION_SYSTEM, prompt, schema: dailySessionSchema, effort: "medium", maxTokens: 16000 });

  // The story is written in two focused calls from the plan's brief: the first
  // half builds to the turning point, the second half resolves it.
  const brief = content.story_brief;
  const cast = v.episode > 1 && v.cast ? v.cast : brief.recurring_cast;
  const arc = v.episode > 1 && v.arc ? v.arc : brief.season_arc;
  const briefText = `## Story brief
Season ${v.season}, Episode ${v.episode}${v.finale ? " (SEASON FINALE - close the arc)" : " (end on a cliffhanger for tomorrow)"}
${plan.previously.length ? `Previously this season:\n${plan.previously.join("\n")}\n` : ""}Recurring cast:\n${cast}
Season arc: ${arc}
Episode title: ${brief.title}
Setting: ${brief.setting}
Protagonist: ${brief.protagonist}
Supporting characters: ${brief.supporting_characters}
Central conflict: ${brief.central_conflict}
Turning point: ${brief.turning_point}
Concepts to dramatise: ${brief.concepts.join(", ")}
Skill being trained: ${DIMENSION_META[focus.dimension].label}`;
  const part1 = await generateStructured({
    language: state.profile.language,
    system: sized(STORY_PART1_SYSTEM),
    prompt: `${context}\n\n${briefText}\n\nWrite the first half now (${words.range} words).`,
    schema: storyPartSchema,
    effort: "medium",
    maxTokens: 24000,
  });
  const part2 = await generateStructured({
    language: state.profile.language,
    system: sized(STORY_PART2_SYSTEM),
    prompt: `${briefText}\n\n## First half (already written)\n${part1.text}\n\nWrite the second half now (${words.range} words), plus the title and 3 insights.`,
    schema: storySchema,
    effort: "medium",
    maxTokens: 24000,
  });
  const story = { title: part2.title || brief.title, body: `${part1.text.trim()}\n\n${part2.body.trim()}`, insights: part2.insights };
  const variety = {
    ...v,
    cast,
    arc,
    episode_title: story.title,
    episode_summary: part2.episode_summary,
    teaser: v.finale ? "" : part2.next_episode_teaser,
  };

  // Some models still write short; expand once if it is well under target.
  if (countWords(story.body) < (short ? 700 : 1000)) {
    try {
      const expanded = await generateStructured({
        language: state.profile.language,
        system: short ? STORY_EXPANSION_SYSTEM.replace("1,100-1,400", "800-1,000") : STORY_EXPANSION_SYSTEM,
        prompt: `Title: ${story.title}\nFocus skill: ${DIMENSION_META[focus.dimension].label}\n\n${story.body}`,
        schema: storyExpansionSchema,
        effort: "low",
        maxTokens: 32000,
      });
      if (countWords(expanded.body) > countWords(story.body)) story.body = expanded.body;
    } catch (err) {
      if (!(err instanceof AIError)) throw err;
      console.warn("[ai] Story expansion failed; keeping the original story.");
    }
  }

  const ids = ["a", "b", "c", "d"];
  const scenarios = content.scenarios.slice(0, 3).map((s, i) => ({
    ...s,
    format: byId(SCENARIO_FORMATS, v.formats[i])?.label ?? null,
    options: s.options.slice(0, 4).map((o, i) => ({ ...o, id: ids[i] })),
  }));
  if (scenarios.length < 3 || scenarios.some((s) => s.options.length < 3)) throw new HttpError(502, "The session was incomplete. Please try again.");
  const reflection = content.reflection_questions.slice(0, 3);

  const { data: session, error } = await db
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
      variety,
    })
    .select("id")
    .single();
  if (error?.code === "23505") {
    const { data } = await db.from("daily_sessions").select("id").eq("user_id", user.id).eq("day_number", state.day).single();
    return { sessionId: data!.id };
  }
  dbError(error);

  const saved = await db.from("generated_stories").insert({
    user_id: user.id,
    session_id: session!.id,
    title: story.title,
    body: story.body.trim(),
    word_count: countWords(story.body),
    insights: story.insights.slice(0, 3),
    target_skills: [focus.dimension],
  });
  dbError(saved.error);
  // A chosen world applies to one new season only.
  if (v.episode === 1 && state.profile.next_world) await db.from("profiles").update({ next_world: null }).eq("id", user.id);
  return { sessionId: session!.id };
});
