import { createHash } from "node:crypto";
import { z } from "zod";
import { generateStructured } from "@/lib/ai/client";
import { NARRATION_SYSTEM, userData } from "@/lib/ai/prompts";
import { narrationSchema } from "@/lib/ai/schemas";
import { apiRoute, dbError, HttpError } from "@/lib/server/api";
import { storyParts } from "@/lib/server/voice";

export const maxDuration = 120;

/**
 * Listening script for a Hinglish story: the same paragraphs in Devanagari with
 * expressive punctuation, so Hindi voices read them with natural flow. Made once
 * per story text with the low-cost everyday model and cached on the story.
 * Returns paragraphs: null when the story doesn't need one or it couldn't be made.
 */
export const POST = apiRoute(z.object({ session_id: z.uuid() }), async ({ session_id }, { db, user }) => {
  const { data: story } = await db.from("generated_stories").select("id, title, body, narration").eq("session_id", session_id).eq("user_id", user.id).maybeSingle();
  if (!story) throw new HttpError(404, "Story not found.");
  const parts = storyParts(story);
  if (/[ऀ-ॿ]/.test(story.body)) return { paragraphs: null };
  const hash = createHash("sha1").update(parts.join("\n\n")).digest("hex");
  const cached = story.narration as { hash: string; paragraphs: string[] } | null;
  if (cached?.hash === hash) return { paragraphs: cached.paragraphs };

  const numbered = parts.map((p, i) => `[${i}] ${p}`).join("\n\n");
  for (let attempt = 0; attempt < 2; attempt++) {
    const out = await generateStructured({
      // Devanagari output whatever the user's reading language is.
      language: "hi",
      system: NARRATION_SYSTEM,
      prompt: `${userData("story", numbered)}\n\nThere are ${parts.length} paragraphs (0-${parts.length - 1}). Return exactly ${parts.length}.`,
      schema: narrationSchema,
      effort: "low",
      maxTokens: 16000,
    });
    const paragraphs = out.paragraphs.map((p) => p.replace(/^\[\d+\]\s*/, "").trim());
    if (paragraphs.length === parts.length && paragraphs.every(Boolean)) {
      const up = await db.from("generated_stories").update({ narration: { hash, paragraphs } }).eq("id", story.id);
      dbError(up.error);
      return { paragraphs };
    }
  }
  return { paragraphs: null };
});
