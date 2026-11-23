"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/db/server";
import { setLearningChoice } from "@/lib/server/signals";

/** Records the answer to the one-time "may this count towards your persona?" popup (also used by the toggles). */
export async function setLearningAction(feature: "coach" | "journal", allowed: boolean): Promise<{ ok: true }> {
  if (feature !== "coach" && feature !== "journal") throw new Error("Unknown feature");
  const { user } = await requireUser();
  await setLearningChoice(user.id, feature, Boolean(allowed));
  revalidatePath("/coach");
  revalidatePath("/journal");
  revalidatePath("/me/persona");
  return { ok: true };
}
