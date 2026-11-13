"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/db/server";

export async function clearCoachHistory() {
  const { db, user } = await requireUser();
  await db.from("coach_messages").delete().eq("user_id", user.id);
  revalidatePath("/coach");
}
