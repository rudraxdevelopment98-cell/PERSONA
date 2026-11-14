"use server";

import { requireUser } from "@/lib/db/server";
import { claimInitialCodes } from "@/lib/server/recovery";

export async function getInitialCodes(): Promise<{ codes: string[] | null }> {
  const { user } = await requireUser();
  return { codes: await claimInitialCodes(user.id) };
}
