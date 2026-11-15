import { z } from "zod";
import { AIError, generateStructured } from "@/lib/ai/client";
import { REFLECTION_SYSTEM, userData } from "@/lib/ai/prompts";
import { reflectionFeedbackSchema } from "@/lib/ai/schemas";
import { apiRoute, dbError, HttpError } from "@/lib/server/api";
import { buildAIContext } from "@/lib/server/context";
import { recomputeScores } from "@/lib/server/progress";
import { ACHIEVEMENTS, loadStats } from "@/lib/server/gamification";
import { levelInfo } from "@/lib/domain/gamification";
import type { SessionRow } from "@/lib/server/types";

export const maxDuration = 300;

const schema = z.object({
  session_id: z.uuid(),
  answers: z.array(z.string().trim().min(10, "Write at least a sentence for each reflection.").max(3000)).min(1).max(3),
});

/** Final step: reflection. The session is only marked complete once every earlier step is done. */
export const POST = apiRoute(schema, async ({ session_id, answers }, { db, user, state }) => {
  const { data } = await db.from("daily_sessions").select("*").eq("id", session_id).eq("user_id", user.id).maybeSingle();
  const session = data as SessionRow | null;
  if (!session) throw new HttpError(404, "Session not found.");
  if (session.completed_at) throw new HttpError(409, "This session is already complete.");
  if (!session.story_completed_at) throw new HttpError(409, "Finish the story first.");
  if (!session.scenarios_completed_at) throw new HttpError(409, "Complete all scenarios first.");
  if (answers.length !== session.reflection_questions.length) throw new HttpError(400, "Please answer every reflection question.");

  const day = Math.max(1, state.day);
  const before = await loadStats(db, user.id, day);
  const startedAt = new Date().toISOString();

  let feedback = null;
  try {
    const context = await buildAIContext(db, state, { checkins: 1 });
    const qa = session.reflection_questions.map((q, i) => `Q: ${q}\nA: ${answers[i]}`).join("\n\n");
    feedback = await generateStructured({
      language: state.profile.language,
      system: REFLECTION_SYSTEM,
      prompt: `${context}\n\n## Today's session\nFocus: ${session.introduction.focus_title}\nChallenge: ${session.challenge.title}\n\n${userData("reflection", qa)}\n\nRespond to the reflection.`,
      schema: reflectionFeedbackSchema,
      effort: "low",
    });
  } catch (err) {
    if (!(err instanceof AIError)) throw err;
  }

  const { error } = await db
    .from("daily_sessions")
    .update({ reflection_answers: answers, reflection_feedback: feedback, completed_at: new Date().toISOString() })
    .eq("id", session.id);
  dbError(error);
  await recomputeScores(db, user.id, "session");

  // Everything the celebration screen shows, from real activity.
  const after = await loadStats(db, user.id, day);
  const { data: fresh } = await db.from("achievements").select("code, earned_at").eq("user_id", user.id).gte("earned_at", startedAt);
  const defs = new Map(ACHIEVEMENTS.map((a) => [a.code, a]));
  const lvBefore = levelInfo(before.xp), lvAfter = levelInfo(after.xp);
  const celebration = {
    xpGained: Math.max(0, after.xp - before.xp),
    xp: after.xp,
    level: lvAfter.level,
    levelName: lvAfter.name,
    levelUp: lvAfter.level > lvBefore.level,
    progress: lvAfter.progress,
    toNext: lvAfter.toNext,
    streak: after.streak,
    sessions: after.sessionsCompleted,
    badges: (fresh ?? []).map((b) => defs.get(b.code)).filter(Boolean).map((d) => ({ title: d!.title, icon: d!.icon, description: d!.description })),
    teaser: session.variety?.finale ? null : (session.variety?.teaser ?? null),
    finale: Boolean(session.variety?.finale),
  };
  return { feedback, celebration };
});
