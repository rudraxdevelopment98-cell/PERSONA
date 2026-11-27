"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/db/server";
import { DIMENSIONS } from "@/lib/domain/dimensions";
import { clampTarget, sanitizeTargets, targetPreset } from "@/lib/domain/targets";

/** Saves the user's manual development targets (and which preset, if any, they started from). */
export async function saveTargets(input: { targets: Record<string, number> | null; preset: string | null }): Promise<{ error?: string }> {
  const { db, user } = await requireUser();

  let targets: Record<string, number> | null = null;
  if (input.targets) {
    targets = {};
    for (const d of DIMENSIONS) {
      const v = input.targets[d];
      if (typeof v === "number" && Number.isFinite(v)) targets[d] = clampTarget(v);
    }
    if (!Object.keys(targets).length) targets = null;
  }

  // Keep the chosen profile label (any lowercase slug, e.g. a preset id or "custom"/"strategic").
  const slug = typeof input.preset === "string" ? input.preset.toLowerCase().replace(/[^a-z_]/g, "").slice(0, 32) : "";
  const preset = slug && (slug === "custom" || targetPreset(slug) || slug.length >= 3) ? slug : null;

  const { error } = await db.from("profiles").update({ skill_targets: sanitizeTargets(targets), target_preset: targets ? preset : null }).eq("id", user.id);
  if (error) return { error: "Could not save your targets." };

  revalidatePath("/goals");
  revalidatePath("/dashboard");
  revalidatePath("/progress");
  return {};
}
