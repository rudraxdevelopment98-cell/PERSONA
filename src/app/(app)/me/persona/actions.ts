"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/db/server";
import { resetSignals } from "@/lib/server/signals";

export async function resetPersonaAction(): Promise<{ ok: true }> {
  const { user } = await requireUser();
  await resetSignals(user.id);
  revalidatePath("/me/persona");
  return { ok: true };
}
