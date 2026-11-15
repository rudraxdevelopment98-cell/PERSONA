"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/db/server";
import { UpgradeRequired, redeemCoupon, startTrial } from "@/lib/server/plan";
import { portalUrl } from "@/lib/server/payments";

async function guard<T extends object>(fn: (userId: string) => Promise<T>): Promise<T | { error: string }> {
  const { user } = await requireUser();
  try {
    const out = await fn(user.id);
    revalidatePath("/", "layout");
    return out;
  } catch (err) {
    if (err instanceof UpgradeRequired) return { error: err.message };
    console.error("[pricing]", err);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function startTrialAction() {
  return guard(async (u) => (await startTrial(u), { ok: true }));
}

export async function redeemCouponAction(code: string) {
  return guard(async (u) => ({ days: await redeemCoupon(u, String(code ?? "").slice(0, 40)) }));
}

export async function portalAction() {
  return guard(async (u) => {
    const url = await portalUrl(u);
    if (!url) throw new UpgradeRequired("Use the link in your Paddle receipt email to manage or cancel your subscription.");
    return { url };
  });
}
