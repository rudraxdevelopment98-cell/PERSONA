"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/db/server";
import { WORLDS } from "@/lib/domain/variety";

/** Lets the user pick the world for their next story season. */
export async function chooseNextWorld(world: string): Promise<{ error?: string }> {
  if (!WORLDS.some((w) => w.id === world)) return { error: "Unknown world." };
  const { db, user } = await requireUser();
  const { error } = await db.from("profiles").update({ next_world: world }).eq("id", user.id);
  if (error) return { error: "Could not save your choice." };
  revalidatePath("/today");
  return {};
}
