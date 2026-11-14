"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/db/server";
import { generateRecoveryCodes } from "@/lib/server/recovery";

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
