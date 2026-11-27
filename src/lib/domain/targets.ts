/** Development targets: how much of each trait the user wants to build.
 *  The user sets these manually (a knob per skill) or picks a preset. They bias
 *  story / assessment / session generation toward the biggest gaps. */

import { DIMENSIONS, type Dimension } from "./dimensions";

export type SkillTargets = Partial<Record<Dimension, number>>;

export const TARGET_MIN = 30;
export const TARGET_MAX = 100;

export const clampTarget = (n: number) => Math.max(TARGET_MIN, Math.min(TARGET_MAX, Math.round(n)));

/** A named target profile — a starting point the user can then fine-tune. */
export type TargetPreset = {
  id: string;
  name: string; // i18n literal
  icon: string; // lucide icon name (resolved in the client)
  blurb: string; // i18n literal
  targets: Record<Dimension, number>;
};

// 10 dimensions, in order:
// confidence, communication, decision_making, emotional_intelligence, social_intelligence,
// assertiveness, independent_thinking, critical_thinking, leadership, self_discipline
const T = (c: number, co: number, d: number, e: number, so: number, a: number, it: number, ct: number, l: number, sd: number): Record<Dimension, number> => ({
  confidence: c,
  communication: co,
  decision_making: d,
  emotional_intelligence: e,
  social_intelligence: so,
  assertiveness: a,
  independent_thinking: it,
  critical_thinking: ct,
  leadership: l,
  self_discipline: sd,
});

export const TARGET_PRESETS: TargetPreset[] = [
  { id: "businessman", name: "Businessman", icon: "briefcase", blurb: "Decisive, commanding, deal-ready.", targets: T(88, 85, 92, 72, 82, 88, 82, 88, 90, 85) },
  { id: "entrepreneur", name: "Entrepreneur", icon: "rocket", blurb: "Bold, self-driven, resourceful.", targets: T(92, 80, 88, 68, 76, 82, 95, 88, 82, 82) },
  { id: "politician", name: "Politician", icon: "landmark", blurb: "Persuasive, people-smart, poised.", targets: T(88, 95, 82, 82, 95, 86, 72, 78, 92, 72) },
  { id: "leader", name: "Team Leader", icon: "flag", blurb: "Inspiring, fair, dependable.", targets: T(82, 88, 86, 86, 86, 82, 76, 82, 95, 82) },
  { id: "speaker", name: "Public Speaker", icon: "mic", blurb: "Confident, clear, magnetic on stage.", targets: T(92, 96, 66, 76, 86, 82, 72, 72, 72, 72) },
  { id: "creative", name: "Creative Innovator", icon: "palette", blurb: "Original, curious, free-thinking.", targets: T(76, 76, 72, 82, 72, 66, 96, 88, 62, 72) },
  { id: "student", name: "Focused Learner", icon: "graduation-cap", blurb: "Disciplined, sharp, independent.", targets: T(72, 72, 72, 72, 66, 66, 82, 92, 62, 96) },
  { id: "athlete", name: "Performer", icon: "zap", blurb: "Driven, resilient, consistent.", targets: T(88, 66, 78, 78, 66, 78, 72, 66, 72, 96) },
  { id: "calm", name: "Calm & Balanced", icon: "leaf", blurb: "Steady, warm, emotionally strong.", targets: T(72, 78, 72, 96, 82, 66, 72, 72, 66, 82) },
  { id: "allround", name: "All-Rounder", icon: "star", blurb: "Strong and even across the board.", targets: T(82, 82, 82, 82, 82, 82, 82, 82, 82, 82) },
];

export const targetPreset = (id: string | null | undefined) => TARGET_PRESETS.find((p) => p.id === id) ?? null;

/** A sensible default profile to start editing from (the All-Rounder). */
export const defaultTargets = (): Record<Dimension, number> => ({ ...TARGET_PRESETS[TARGET_PRESETS.length - 1].targets });

/** Keep only valid dimensions, clamped. */
export function sanitizeTargets(raw: unknown): SkillTargets | null {
  if (!raw || typeof raw !== "object") return null;
  const out: SkillTargets = {};
  for (const d of DIMENSIONS) {
    const v = (raw as Record<string, unknown>)[d];
    if (typeof v === "number" && Number.isFinite(v)) out[d] = clampTarget(v);
  }
  return Object.keys(out).length ? out : null;
}

/** Gap-ranked focus: biggest (target − current) first. */
export function focusRanking(targets: SkillTargets, current: Partial<Record<Dimension, number>>): { dimension: Dimension; target: number; current: number; gap: number }[] {
  return DIMENSIONS.filter((d) => targets[d] != null)
    .map((d) => ({ dimension: d, target: targets[d]!, current: Math.round(current[d] ?? 0), gap: targets[d]! - Math.round(current[d] ?? 0) }))
    .sort((a, b) => b.gap - a.gap);
}
