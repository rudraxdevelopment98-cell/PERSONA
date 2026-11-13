import type { Dimension } from "./dimensions";

export const PROGRAMME_LENGTH = 90;

export type Phase = {
  number: 1 | 2 | 3;
  name: string;
  days: [number, number];
  summary: string;
  focus: { title: string; dimension: Dimension }[];
};

export const PHASES: Phase[] = [
  {
    number: 1,
    name: "Foundation",
    days: [1, 30],
    summary: "Build self-awareness and the confidence to act on your own judgement.",
    focus: [
      { title: "Self-awareness", dimension: "emotional_intelligence" },
      { title: "Confidence", dimension: "confidence" },
      { title: "Fear of judgement", dimension: "confidence" },
      { title: "Independent decisions", dimension: "independent_thinking" },
      { title: "Expressing opinions", dimension: "assertiveness" },
    ],
  },
  {
    number: 2,
    name: "Development",
    days: [31, 60],
    summary: "Turn awareness into skill in conversations, disagreements and analysis.",
    focus: [
      { title: "Communication", dimension: "communication" },
      { title: "Assertiveness", dimension: "assertiveness" },
      { title: "Handling disagreement", dimension: "social_intelligence" },
      { title: "Critical thinking", dimension: "critical_thinking" },
      { title: "Social intelligence", dimension: "social_intelligence" },
    ],
  },
  {
    number: 3,
    name: "Transformation",
    days: [61, 90],
    summary: "Lead, decide and communicate with steadiness under real pressure.",
    focus: [
      { title: "Leadership", dimension: "leadership" },
      { title: "Emotional control", dimension: "emotional_intelligence" },
      { title: "Decision-making", dimension: "decision_making" },
      { title: "Personal discipline", dimension: "self_discipline" },
      { title: "Confident communication", dimension: "communication" },
    ],
  },
];

export function phaseForDay(day: number): Phase {
  return PHASES.find((p) => day >= p.days[0] && day <= p.days[1]) ?? PHASES[PHASES.length - 1];
}

/**
 * Default topic for a programme day. Each phase cycles through its five focus
 * areas in 6-day blocks (5 blocks x 6 days = 30 days). Within a block, the
 * personalised roadmap can override the emphasis based on the user's weakest
 * dimensions (see focusForDay).
 */
export function baseFocusForDay(day: number): { title: string; dimension: Dimension } {
  const phase = phaseForDay(day);
  const offset = day - phase.days[0];
  return phase.focus[Math.floor(offset / 6) % phase.focus.length];
}

/**
 * Personalised focus: every third day inside a block, train the user's weakest
 * dimension that is relevant to the phase, so weaknesses get extra repetitions
 * without abandoning the phase structure.
 */
export function focusForDay(
  day: number,
  weakest: Dimension[] = [],
): { title: string; dimension: Dimension; personalised: boolean } {
  const base = baseFocusForDay(day);
  const offset = day - phaseForDay(day).days[0];
  if (weakest.length > 0 && offset % 3 === 2) {
    const target = weakest[Math.floor(offset / 3) % weakest.length];
    if (target !== base.dimension) {
      return { title: `${base.title} - applied to your growth area`, dimension: target, personalised: true };
    }
  }
  return { ...base, personalised: false };
}

/** Programme day for a given date (1-based), or 0 if the programme has not started. */
export function programmeDay(startDate: string | null, today: string): number {
  if (!startDate) return 0;
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(now) || now < start) return 0;
  return Math.min(PROGRAMME_LENGTH, Math.floor((now - start) / 86_400_000) + 1);
}

/** Today's date (YYYY-MM-DD) in the user's IANA timezone. */
export function todayIn(timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/** Consecutive completed programme days ending today (or yesterday, if today is not done yet). */
export function currentStreak(completedDays: number[], today: number): number {
  const done = new Set(completedDays);
  let d = done.has(today) ? today : today - 1;
  let streak = 0;
  while (d >= 1 && done.has(d)) {
    streak++;
    d--;
  }
  return streak;
}
