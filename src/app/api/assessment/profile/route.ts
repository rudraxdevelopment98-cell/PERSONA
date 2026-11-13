import { z } from "zod";
import { DIMENSIONS, type Dimension } from "@/lib/domain/dimensions";
import { apiRoute, requireBaseline } from "@/lib/server/api";
import { generateDevelopmentProfile } from "@/lib/server/profile";

export const maxDuration = 120;

/** Regenerates the development profile from the stored baseline assessment. */
export const POST = apiRoute(z.object({}), async (_body, { supabase, user, state }) => {
  requireBaseline(state);
  const scores = Object.fromEntries(DIMENSIONS.map((d) => [d, state.baseline!.scores?.[d] ?? 0])) as Record<Dimension, number>;
  const profile = await generateDevelopmentProfile(supabase, user.id, scores, state.baseline!.reflections);
  return { profile };
});
