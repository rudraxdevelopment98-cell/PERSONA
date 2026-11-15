"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/db/server";
import * as admin from "@/lib/server/admin";

async function run(fn: (userId: string) => Promise<void>): Promise<{ error?: string }> {
  const { user } = await requireUser();
  try {
    await fn(user.id);
    revalidatePath("/admin");
    return {};
  } catch (err) {
    if (err instanceof admin.AdminError) return { error: err.message };
    console.error("[admin action]", err);
    return { error: "Something went wrong." };
  }
}

const uuid = z.string().uuid();
const id = z.string().min(1).max(64);

export async function claimAdminAction(code: string) {
  return run((u) => admin.claimAdmin(u, String(code).slice(0, 200)));
}

export async function closeReportAction(reportId: string, status: "resolved" | "dismissed", note: string) {
  if (!uuid.safeParse(reportId).success || !["resolved", "dismissed"].includes(status)) return { error: "Invalid request." };
  return run((u) => admin.closeReport(u, reportId, status, String(note ?? "")));
}

export async function suspendAction(userId: string, suspend: boolean) {
  if (!id.safeParse(userId).success) return { error: "Invalid user." };
  return run((u) => (suspend ? admin.suspendUser(u, userId) : admin.unsuspendUser(u, userId)));
}

export async function deleteCircleAction(circleId: string) {
  if (!uuid.safeParse(circleId).success) return { error: "Invalid circle." };
  return run((u) => admin.deleteCircle(u, circleId));
}

export async function addAdminAction(email: string) {
  if (!z.string().email().safeParse(email).success) return { error: "Enter a valid email." };
  return run((u) => admin.addAdmin(u, email));
}
