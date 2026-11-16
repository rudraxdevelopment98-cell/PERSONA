import { z } from "zod";
import { apiRoute, dbError, HttpError } from "@/lib/server/api";
import { countWords, writeSecondHalf } from "@/lib/server/story";

export const maxDuration = 300;

const schema = z.object({
  session_id: z.uuid(),
  option: z.enum(["a", "b", "c"]),
  line: z.string().trim().max(200).optional(),
});

type Choice = { question: string; options: { id: string; text: string; vibe?: string }[] };

/** The reader decides what the protagonist does; the second half is written from that choice. */
export const POST = apiRoute(schema, async ({ session_id, option, line }, { db, user, state }) => {
  const { data: story } = await db
    .from("generated_stories")
    .select("id, title, body, brief, choice, chosen, part2_at")
    .eq("session_id", session_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!story) throw new HttpError(404, "Story not found.");
  if (story.part2_at) return { ok: true, already: true };
  const choice = story.choice as Choice | null;
  const picked = choice?.options.find((o) => o.id === option);
  if (!choice || !picked || !story.brief) throw new HttpError(400, "This episode has no choice to make.");

  const { data: session } = await db.from("daily_sessions").select("variety").eq("id", session_id).eq("user_id", user.id).single();
  const v = (session?.variety ?? {}) as { finale?: boolean } & Record<string, unknown>;
  const cleanLine = line?.replace(/\s+/g, " ").slice(0, 200) || null;

  const part2 = await writeSecondHalf({
    userId: user.id,
    language: state.profile.language,
    briefText: story.brief,
    firstHalf: story.body,
    choice: { question: choice.question, option: picked.text, line: cleanLine },
  });
  const body = `${story.body.trim()}\n\n${part2.body.trim()}`;

  // Only the first finished request writes; a double tap cannot append twice.
  const { data: updated, error } = await db
    .from("generated_stories")
    .update({
      body,
      word_count: countWords(body),
      insights: part2.insights.slice(0, 3),
      chosen: option,
      user_line: cleanLine,
      choice_feedback: part2.choice_reflection || null,
      part2_at: new Date().toISOString(),
    })
    .eq("id", story.id)
    .is("part2_at", null)
    .select("id");
  dbError(error);
  if (!updated?.length) return { ok: true, already: true };

  const variety = {
    ...v,
    episode_title: part2.title || story.title,
    episode_summary: part2.episode_summary,
    teaser: v.finale ? "" : part2.next_episode_teaser,
    chosen: picked.text,
  };
  const up = await db.from("daily_sessions").update({ variety }).eq("id", session_id).eq("user_id", user.id);
  dbError(up.error);
  return { ok: true };
});
