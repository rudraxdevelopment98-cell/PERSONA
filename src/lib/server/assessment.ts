import "server-only";
import { DEPTHS, UPGRADE_WINDOW_DAYS, type AssessmentDepth } from "@/lib/domain/assessment";
import type { UserState } from "./state";

/** Deeper levels the user can still move their completed baseline to. */
export function upgradeOptions(state: UserState): AssessmentDepth[] {
  const b = state.baseline;
  if (!b || state.day > UPGRADE_WINDOW_DAYS) return [];
  const current = DEPTHS.indexOf(b.depth ?? "deep");
  return DEPTHS.filter((_, i) => i > current);
}
