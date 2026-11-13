import { z } from "zod";
import { AIError, generateStructured } from "@/lib/ai/client";
import { REFLECTION_SYSTEM, userData } from "@/lib/ai/prompts";
import { reflectionFeedbackSchema } from "@/lib/ai/schemas";
import { apiRoute, dbError, HttpError } from "@/lib/server/api";
import { buildAIContext } from "@/lib/server/context";
import { recomputeScores } from "@/lib/server/progress";
import type { SessionRow } from "@/lib/server/types";

export const maxDuration = 120;

const schema = z.object({
  session_id: z.uuid(),
  answers: z.array(z.string().trim().min(10, "Write at least a sentence for each reflection.").max(3000)).min(1).max(3),
});

/** Final step: reflection. The session is only marked complete once every earlier step is done. */
export const POST = apiRoute(schema, async ({ session_id, answers }, { supabase, user, state }) => {
  const { data } = await supabase.from("daily_sessions").select("*").eq("id", session_id).eq("user_id", user.id).maybeSingle();
  const session = data as SessionRow | null;
  if (!session) throw new HttpError(404, "Session not found.");
  if (session.completed_at) throw new HttpError(409, "This session is already complete.");
  if (!session.story_completed_at) throw new HttpError(409, "Finish the story first.");
  if (!session.scenarios_completed_at) throw new HttpError(409, "Complete all scenarios first.");
  if (answers.length !== session.reflection_questions.length) throw new HttpError(400, "Please answer every reflection question.");

  let feedback = null;
  try {
    const context = await buildAIContext(supabase, state, { checkins: 1 });
    const qa = session.reflection_questions.map((q, i) => `Q: ${q}\nA: ${answers[i]}`).join("\n\n");
    feedback = await generateStructured({
      system: REFLECTION_SYSTEM,
      prompt: `${context}\n\n## Today's session\nFocus: ${session.introduction.focus_title}\nChallenge: ${session.challenge.title}\n\n${userData("reflection", qa)}\n\nRespond to the reflection.`,
      schema: reflectionFeedbackSchema,
      effort: "low",
    });
  } catch (err) {
    if (!(err instanceof AIError)) throw err;
  }

  const { error } = await supabase
    .from("daily_sessions")
    .update({ reflection_answers: answers, reflection_feedback: feedback, completed_at: new Date().toISOString() })
    .eq("id", session.id);
  dbError(error);
  await recomputeScores(supabase, user.id, "session");
  return { feedback };
});
