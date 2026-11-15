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

export async function deleteUserAction(userId: string, confirmText: string) {
  if (!id.safeParse(userId).success) return { error: "Invalid user." };
  if (confirmText !== "DELETE") return { error: 'Type "DELETE" to confirm.' };
  return run((u) => admin.deleteUser(u, userId));
}

export async function setAdminAction(userId: string, makeAdmin: boolean) {
  if (!id.safeParse(userId).success) return { error: "Invalid user." };
  return run((u) => (makeAdmin ? admin.makeAdmin(u, userId) : admin.removeAdmin(u, userId)));
}

export async function messageUserAction(userId: string, title: string, body: string) {
  const parsed = z.object({ title: z.string().trim().min(2).max(80), body: z.string().trim().min(2).max(300) }).safeParse({ title, body });
  if (!id.safeParse(userId).success || !parsed.success) return { error: "Write a title and a message." };
  return run((u) => admin.messageUser(u, userId, parsed.data.title, parsed.data.body));
}

export async function broadcastAction(input: { title: string; body: string; url: string; audience: string }) {
  const parsed = z
    .object({
      title: z.string().trim().min(2, "Title is too short.").max(80),
      body: z.string().trim().min(2, "Message is too short.").max(300),
      url: z.string().trim().max(200),
      audience: z.enum(["all", "active", "inactive"]),
    })
    .safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  return run(async (u) => {
    await admin.broadcast(u, parsed.data);
  });
}

export async function savePaymentsAction(input: { env: string; clientToken: string; priceMonth: string; priceYear: string; apiKey: string; webhookSecret: string }) {
  const parsed = z
    .object({
      env: z.enum(["sandbox", "production"]),
      clientToken: z.string().trim().max(200),
      priceMonth: z.string().trim().max(100),
      priceYear: z.string().trim().max(100),
      apiKey: z.string().trim().max(300),
      webhookSecret: z.string().trim().max(300),
    })
    .safeParse(input);
  if (!parsed.success) return { error: "Check the payment settings." };
  return run(async (u) => {
    await admin.requireAdmin(u);
    const { saveConfig } = await import("@/lib/server/payments");
    await saveConfig({ ...parsed.data, apiKey: parsed.data.apiKey || undefined, webhookSecret: parsed.data.webhookSecret || undefined });
    await admin.audit(u, "payments.configure", { label: parsed.data.env });
  });
}

export async function createCouponAction(input: { code: string; days: number; maxUses: number; expiresInDays: number | null; note: string }) {
  const parsed = z
    .object({
      code: z.string().trim().min(4).max(32),
      days: z.number().int().min(1).max(3650),
      maxUses: z.number().int().min(1).max(100000),
      expiresInDays: z.number().int().min(1).max(3650).nullable(),
      note: z.string().max(200),
    })
    .safeParse(input);
  if (!parsed.success) return { error: "Check the code details." };
  return run((u) => admin.createCoupon(u, parsed.data));
}

export async function deleteCouponAction(code: string) {
  return run((u) => admin.deleteCoupon(u, String(code).slice(0, 40)));
}

export async function grantProAction(email: string, days: number) {
  if (!z.string().email().safeParse(email).success || !Number.isInteger(days) || days < 1 || days > 3650) return { error: "Enter an email and 1-3650 days." };
  return run((u) => admin.grantProByEmail(u, email, days));
}
