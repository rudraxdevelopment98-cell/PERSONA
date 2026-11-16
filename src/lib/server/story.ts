import "server-only";
import { generateStructured } from "@/lib/ai/client";
import { STORY_PART2_SYSTEM, type Language } from "@/lib/ai/prompts";
import { storySchema } from "@/lib/ai/schemas";
import { getPlan } from "./plan";

export const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Free users (on the app's AI) get shorter halves; Pro and own-key users longer ones. */
export async function storySize(userId: string) {
  const short = !(await getPlan(userId)).unlimitedAI;
  const words = short ? { range: "450-550", min: "450" } : { range: "650-800", min: "650" };
  const sized = (sys: string) => sys.replaceAll("650-800 words (never fewer than 650)", `${words.range} words (never fewer than ${words.min})`);
  return { short, words, sized };
}

/** Writes the second half of an episode, optionally from the reader's choice and line. */
export async function writeSecondHalf(opts: {
  userId: string;
  language: Language | null | undefined;
  briefText: string;
  firstHalf: string;
  choice?: { question: string; option: string; line: string | null } | null;
}) {
  const { words, sized } = await storySize(opts.userId);
  const chose = opts.choice
    ? `\n\n## The READER CHOSE\nAt "${opts.choice.question}" the reader chose: ${opts.choice.option}${
        opts.choice.line ? `\nThe protagonist says this line, word for word: <user_data label="reader line">${opts.choice.line.replaceAll("</user_data>", "")}</user_data>` : ""
      }`
    : "";
  return generateStructured({
    language: opts.language,
    system: sized(STORY_PART2_SYSTEM),
    prompt: `${opts.briefText}\n\n## First half (already written)\n${opts.firstHalf}${chose}\n\nWrite the second half now (${words.range} words), plus the title and 3 insights.`,
    schema: storySchema,
    effort: "medium",
    maxTokens: 24000,
  });
}
