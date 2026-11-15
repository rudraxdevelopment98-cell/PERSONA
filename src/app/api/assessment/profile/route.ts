import { z } from "zod";
import { DIMENSIONS, type Dimension } from "@/lib/domain/dimensions";
import { apiRoute, requireBaseline } from "@/lib/server/api";
import { generateDevelopmentProfile } from "@/lib/server/profile";

export const maxDuration = 300;

/** Regenerates the development profile from the stored baseline assessment. */
export const POST = apiRoute(z.object({}), async (_body, { db, user, state }) => {
  requireBaseline(state);
  const scores = Object.fromEntries(DIMENSIONS.map((d) => [d, state.baseline!.scores?.[d] ?? 0])) as Record<Dimension, number>;
  const profile = await generateDevelopmentProfile(db, user.id, scores, state.baseline!.reflections, state.profile.language, state.baseline!.depth ?? "deep");
  return { profile };
});
