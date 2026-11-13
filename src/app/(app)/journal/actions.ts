"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/db/server";

const entrySchema = z.object({
  id: z.uuid().optional(),
  title: z.string().trim().min(1, "Add a title.").max(200),
  body: z.string().trim().min(1, "Write something first.").max(20000),
  entry_type: z.enum(["reflection", "observation", "decision", "emotion", "lesson"]),
  mood: z.number().int().min(1).max(10).nullable(),
  tags: z.array(z.string().trim().toLowerCase().min(1).max(30)).max(10),
});

export type JournalInput = z.infer<typeof entrySchema>;

export async function saveJournalEntry(input: JournalInput): Promise<{ error?: string }> {
  const parsed = entrySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid entry." };
  const { db, user } = await requireUser();
  const { id, ...fields } = parsed.data;
  const { error } = id
    ? await db.from("journal_entries").update(fields).eq("id", id).eq("user_id", user.id)
    : await db.from("journal_entries").insert({ ...fields, user_id: user.id });
  if (error) return { error: "Could not save the entry." };
  if (!id) {
    const { awardAchievements } = await import("@/lib/server/progress");
    await awardAchievements(db, user.id);
  }
  revalidatePath("/journal");
  return {};
}

export async function deleteJournalEntry(id: string): Promise<{ error?: string }> {
  if (!z.uuid().safeParse(id).success) return { error: "Invalid entry." };
  const { db, user } = await requireUser();
  const { error } = await db.from("journal_entries").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: "Could not delete the entry." };
  revalidatePath("/journal");
  return {};
}
