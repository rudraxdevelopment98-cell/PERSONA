import "server-only";
import type { Db } from "@/lib/db/server";
import { generateStructured } from "@/lib/ai/client";
import { PROFILE_SYSTEM, userData } from "@/lib/ai/prompts";
import { developmentProfileSchema } from "@/lib/ai/schemas";
import { DIMENSION_META, DIMENSIONS, type Dimension } from "@/lib/domain/dimensions";
import { dbError } from "./api";

export async function generateDevelopmentProfile(
  db: Db,
  userId: string,
  scores: Record<Dimension, number>,
  reflections: { held_back: string; goal: string } | null,
) {
  const ranked = [...DIMENSIONS].sort((a, b) => scores[b] - scores[a]);
  const prompt = [
    "Baseline assessment scores (0-100):",
    ...ranked.map((d) => `- ${DIMENSION_META[d].label} (${d}): ${scores[d]}`),
    "",
    reflections ? userData("a recent situation where I held back", reflections.held_back) : "",
    reflections ? userData("what I want to be different after 90 days", reflections.goal) : "",
    "",
    "Write the development profile.",
  ].join("\n");

  const profile = await generateStructured({ system: PROFILE_SYSTEM, prompt, schema: developmentProfileSchema, effort: "medium" });
  const { error } = await db
    .from("profiles")
    .update({ development_profile: profile, roadmap: profile.roadmap })
    .eq("id", userId);
  dbError(error);
  return profile;
}
