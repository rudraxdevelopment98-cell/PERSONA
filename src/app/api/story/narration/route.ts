import { createHash } from "node:crypto";
import { z } from "zod";
import { generateStructured } from "@/lib/ai/client";
import { NARRATION_SYSTEM, userData } from "@/lib/ai/prompts";
import { narrationSchema } from "@/lib/ai/schemas";
import { normaliseSentence, type ScriptSentence } from "@/lib/domain/emotion";
import { apiRoute, dbError, HttpError } from "@/lib/server/api";
import { storyParts } from "@/lib/server/voice";

export const maxDuration = 120;

const SCRIPT_VERSION = 2;

/**
 * Listening script: every sentence of the story with the emotion it should be
 * spoken with, its intensity and who is speaking. Hinglish stories are also
 * written in Devanagari so Hindi voices read them smoothly. Made once per story
 * text with the low-cost everyday model and cached on the story.
 * Returns sentences: null when it couldn't be made (the reader falls back to punctuation cues).
 */
export const POST = apiRoute(z.object({ session_id: z.uuid() }), async ({ session_id }, { db, user }) => {
  const { data: story } = await db.from("generated_stories").select("id, title, body, narration").eq("session_id", session_id).eq("user_id", user.id).maybeSingle();
  if (!story) throw new HttpError(404, "Story not found.");
  const parts = storyParts(story);
  const devanagari = /[ऀ-ॿ]/.test(story.body);
  const words: string[] = String(story.body).toLowerCase().match(/[a-z]+/g) ?? [];
  const hinglish = !devanagari && words.length > 0 && words.filter((w) => /^(hai|hain|nahi|kya|mein|tum|aur|ki|ka|ke|ko|se|ne|bhi|toh|tha|thi|kar|raha|rahi)$/.test(w)).length / words.length > 0.06;
  const hash = createHash("sha1").update(`v${SCRIPT_VERSION}\n${parts.join("\n\n")}`).digest("hex");
  const cached = story.narration as { hash: string; sentences?: ScriptSentence[][] } | null;
  if (cached?.hash === hash && cached.sentences) return { sentences: cached.sentences, script: hinglish ? "devanagari" : "original" };

  const rule = hinglish
    ? "SCRIPT RULE: the story is Hinglish (Hindi in Roman letters). Write every text in Devanagari as natural spoken Hindi; English words people normally say stay as they sound, in Devanagari (e.g. मीटिंग, बॉस, ऑफिस)."
    : "SCRIPT RULE: keep every text exactly in the story's own language and script; only split it into sentences and add expressive punctuation.";
  const numbered = parts.map((p, i) => `[${i}] ${p}`).join("\n\n");
  for (let attempt = 0; attempt < 2; attempt++) {
    const out = await generateStructured({
      // The script language follows the rule above, not the reader's setting.
      language: hinglish || devanagari ? "hi" : "en",
      system: NARRATION_SYSTEM,
      prompt: `${rule}\n\n${userData("story", numbered)}\n\nThere are ${parts.length} paragraphs (0-${parts.length - 1}). Return exactly ${parts.length}.`,
      schema: narrationSchema,
      effort: "low",
      maxTokens: 24000,
    });
    const sentences = out.paragraphs.map((p) => p.sentences.map((s) => normaliseSentence({ ...s, text: s.text.replace(/^\[\d+\]\s*/, "") })).filter((s) => s.text));
    if (sentences.length === parts.length && sentences.every((p) => p.length > 0)) {
      const up = await db.from("generated_stories").update({ narration: { hash, sentences } }).eq("id", story.id);
      dbError(up.error);
      return { sentences, script: hinglish ? "devanagari" : "original" };
    }
  }
  return { sentences: null, script: null };
});
