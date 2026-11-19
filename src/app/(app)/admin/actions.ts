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

export async function saveAiTiersAction(free: string, pro: string, light = "default", lightForPro = false) {
  if (typeof free !== "string" || typeof pro !== "string" || typeof light !== "string") return { error: "Pick a model for each plan." };
  return run((u) => admin.saveAiTiers(u, free.slice(0, 80), pro.slice(0, 80), light.slice(0, 80), Boolean(lightForPro)));
}

export async function saveAndroidAction(fingerprints: string) {
  if (typeof fingerprints !== "string") return { error: "Paste the fingerprints." };
  return run((u) => admin.saveAndroid(u, fingerprints.slice(0, 2000)));
}

export async function saveVoiceAction(model: string, proPerMonth: number, freePerMonth: number) {
  if (typeof model !== "string") return { error: "Pick a voice model." };
  return run((u) => admin.saveVoice(u, model.slice(0, 80), Number(proPerMonth), Number(freePerMonth)));
}

export async function testModelAction(choiceId: string) {
  const { user } = await requireUser();
  try {
    return await admin.testModel(user.id, String(choiceId).slice(0, 80));
  } catch (err) {
    return { ok: false as const, ms: 0, error: err instanceof admin.AdminError ? err.message : "Test failed." };
  }
}

const campaignSchema = z.object({
  sponsorName: z.string().trim().min(2, "Sponsor name is required.").max(80),
  category: z.enum(["book", "podcast", "course", "app", "event", "other"]),
  title: z.string().trim().min(2, "Title is required.").max(80),
  body: z.string().trim().min(2, "Text is required.").max(220),
  ctaLabel: z.string().trim().min(2).max(30),
  url: z.string().trim().url("Enter a full https:// link.").max(400),
  placements: z.array(z.enum(["dashboard", "after_session", "labs"])).min(1, "Pick at least one place."),
  languages: z.array(z.enum(["en", "hinglish", "hi"])).nullable(),
  days: z.number().int().min(1).max(3650).nullable(),
  maxViews: z.number().int().min(1).max(100_000_000).nullable(),
  weight: z.number().int().min(1).max(10),
});

export async function createCampaignAction(input: unknown) {
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the campaign." };
  return run((u) => admin.createCampaign(u, parsed.data));
}

export async function setCampaignActiveAction(campaignId: string, active: boolean) {
  if (!uuid.safeParse(campaignId).success) return { error: "Invalid campaign." };
  return run((u) => admin.setCampaignActive(u, campaignId, Boolean(active)));
}

export async function deleteCampaignAction(campaignId: string) {
  if (!uuid.safeParse(campaignId).success) return { error: "Invalid campaign." };
  return run((u) => admin.deleteCampaign(u, campaignId));
}

export async function setSponsorRequestAction(requestId: string, status: string) {
  if (!uuid.safeParse(requestId).success || !["new", "contacted", "done", "declined"].includes(status)) return { error: "Invalid request." };
  return run((u) => admin.setSponsorRequestStatus(u, requestId, status));
}
