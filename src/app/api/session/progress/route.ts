import { z } from "zod";
import { apiRoute, dbError, HttpError } from "@/lib/server/api";

const schema = z.object({
  session_id: z.uuid(),
  progress: z.number().int().min(0).max(100),
  complete: z.boolean().default(false),
});

// Minimum reading time before a story can be marked read: ~350 words/minute
// (a brisk pace) with a floor of 90 seconds.
const minReadingMs = (words: number) => Math.max(90_000, (words / 350) * 60_000);

/** Tracks story reading progress; completion requires reaching the end and a plausible reading time. */
export const POST = apiRoute(schema, async ({ session_id, progress, complete }, { supabase, user }) => {
  const { data: session } = await supabase
    .from("daily_sessions")
    .select("id, story_progress, story_completed_at, created_at")
    .eq("id", session_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session) throw new HttpError(404, "Session not found.");

  const update: Record<string, unknown> = { story_progress: Math.max(session.story_progress, progress) };
  if (complete && !session.story_completed_at) {
    if (progress < 95) throw new HttpError(400, "Read to the end of the story first.");
    const { data: story } = await supabase.from("generated_stories").select("word_count").eq("session_id", session_id).single();
    const elapsed = Date.now() - Date.parse(session.created_at);
    if (elapsed < minReadingMs(story?.word_count ?? 1000)) {
      throw new HttpError(400, "Take your time with the story - it is the core of today's session.");
    }
    update.story_progress = 100;
    update.story_completed_at = new Date().toISOString();
  }
  const { error } = await supabase.from("daily_sessions").update(update).eq("id", session_id);
  dbError(error);
  return { ok: true, story_completed: Boolean(update.story_completed_at ?? session.story_completed_at) };
});
