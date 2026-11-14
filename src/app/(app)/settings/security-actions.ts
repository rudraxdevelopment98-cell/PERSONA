"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/db/server";
import { z } from "zod";
import { generateRecoveryCodes, normaliseAnswer, saveSecurityQuestions } from "@/lib/server/recovery";

export async function createRecoveryCodes(): Promise<{ codes?: string[]; error?: string }> {
  const { db, user } = await requireUser();
  try {
    const codes = await generateRecoveryCodes(db, user.id);
    revalidatePath("/settings");
    return { codes };
  } catch {
    return { error: "Could not create recovery codes." };
  }
}

const PROGRAMME_TABLES = [
  "assessments",
  "daily_checkins",
  "daily_sessions",
  "exercise_completions",
  "decision_logs",
  "personality_scores",
  "skill_progress",
  "achievements",
  "coach_messages",
];

/** Starts the 90-day programme again from the assessment. The account itself is kept. */
export async function resetProgress(confirmation: string, keepJournal: boolean): Promise<{ error?: string }> {
  if (confirmation !== "RESET") return { error: 'Type "RESET" to confirm.' };
  const { db, user } = await requireUser();
  for (const table of keepJournal ? PROGRAMME_TABLES : [...PROGRAMME_TABLES, "journal_entries"]) {
    const { error } = await db.from(table).delete().eq("user_id", user.id);
    if (error) return { error: "Could not reset everything. Please try again." };
  }
  const { error } = await db
    .from("profiles")
    .update({ programme_start_date: null, development_profile: null, roadmap: null })
    .eq("id", user.id);
  if (error) return { error: "Could not reset your profile. Please try again." };
  revalidatePath("/", "layout");
  return {};
}

const questionsSchema = z.object({
  q1: z.string().trim().min(5, "Write the first question.").max(200),
  a1: z.string().trim().max(200),
  q2: z.string().trim().min(5, "Write the second question.").max(200),
  a2: z.string().trim().max(200),
});

export async function saveMyQuestions(input: { q1: string; a1: string; q2: string; a2: string }): Promise<{ error?: string }> {
  const parsed = questionsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid questions." };
  const { q1, a1, q2, a2 } = parsed.data;
  if (normaliseAnswer(a1).length < 3 || normaliseAnswer(a2).length < 3) return { error: "Each answer needs at least 3 letters or numbers." };
  if (q1.toLowerCase() === q2.toLowerCase()) return { error: "Use two different questions." };
  if (normaliseAnswer(a1) === normaliseAnswer(a2)) return { error: "Use two different answers." };
  const { db, user } = await requireUser();
  try {
    await saveSecurityQuestions(db, user.id, parsed.data);
    revalidatePath("/settings");
    return {};
  } catch {
    return { error: "Could not save your security questions." };
  }
}
