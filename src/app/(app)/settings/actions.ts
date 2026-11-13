"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { deleteUserAccount, requireUser } from "@/lib/db/server";

const schema = z.object({
  display_name: z.string().trim().max(80),
  timezone: z.string().trim().max(64).refine((tz) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Unknown timezone."),
  coach_journal_access: z.boolean(),
});

export async function updateSettings(input: z.infer<typeof schema>): Promise<{ error?: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid settings." };
  const { db, user } = await requireUser();
  const { error } = await db.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { error: "Could not save settings." };
  revalidatePath("/", "layout");
  return {};
}

export async function deleteAccount(confirmation: string): Promise<{ error?: string }> {
  if (confirmation !== "DELETE") return { error: 'Type "DELETE" to confirm.' };
  const { user } = await requireUser();
  try {
    await auth.api.signOut({ headers: await headers() }).catch(() => {});
    await deleteUserAccount(user.id);
  } catch {
    return { error: "Could not delete your account. Please try again." };
  }
  redirect("/");
}
