"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";

export async function clearCoachHistory() {
  const { supabase, user } = await requireUser();
  await supabase.from("coach_messages").delete().eq("user_id", user.id);
  revalidatePath("/coach");
}
