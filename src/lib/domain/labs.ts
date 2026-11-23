import type { Dimension } from "./dimensions";

export const DECISION_CATEGORIES = [
  { id: "personal", label: "Personal life" },
  { id: "relationships", label: "Family & relationships" },
  { id: "money", label: "Money & resources" },
  { id: "career", label: "Studies, work & career" },
  { id: "team", label: "Groups & leadership" },
  { id: "ethics", label: "Ethics & integrity" },
] as const;

export const DECISION_DIFFICULTIES = [
  { id: "everyday", label: "Everyday" },
  { id: "moderate", label: "Moderate" },
  { id: "high_stakes", label: "High stakes" },
] as const;

export const COMMUNICATION_EXERCISES: { id: string; label: string; skill: Dimension; description: string }[] = [
  { id: "expressing_opinions", label: "Expressing opinions", skill: "assertiveness", description: "State a clear view, with reasons, when others may disagree." },
  { id: "handling_disagreement", label: "Handling disagreement", skill: "social_intelligence", description: "Disagree without escalating or giving in." },
  { id: "responding_to_criticism", label: "Responding to criticism", skill: "emotional_intelligence", description: "Separate useful feedback from the sting, and respond calmly." },
  { id: "starting_conversations", label: "Starting conversations", skill: "social_intelligence", description: "Open a conversation naturally with someone you don't know well." },
  { id: "speaking_confidently", label: "Speaking confidently", skill: "confidence", description: "Present your idea without hedging or over-apologising." },
  { id: "setting_boundaries", label: "Setting boundaries", skill: "assertiveness", description: "Say no or set a limit while keeping the relationship intact." },
  { id: "responding_under_pressure", label: "Responding under pressure", skill: "emotional_intelligence", description: "Stay composed when put on the spot." },
];

export const EXERCISE_BY_ID = new Map(COMMUNICATION_EXERCISES.map((e) => [e.id, e]));

export type DecisionStatsInput = {
  score: number | null;
  confidence: number | null;
  first_choice_ms: number | null;
  total_time_ms: number | null;
  choice_changes: number | null;
};

/** Descriptive statistics over completed decisions. Returns null until there is real data. */
export function decisionStats(logs: DecisionStatsInput[]) {
  const done = logs.filter((l) => l.score != null && l.confidence != null);
  if (done.length === 0) return null;
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const firstChoice = avg(done.flatMap((l) => (l.first_choice_ms != null ? [l.first_choice_ms / 1000] : [])));
  const total = avg(done.flatMap((l) => (l.total_time_ms != null ? [l.total_time_ms / 1000] : [])));
  const changes = avg(done.map((l) => l.choice_changes ?? 0))!;
  const confidence = avg(done.map((l) => l.confidence!))!;
  const score = avg(done.map((l) => l.score!))!;
  // Calibration: stated confidence (scaled to 0-100) minus evaluated reasoning quality.
  const calibration = avg(done.map((l) => l.confidence! * 10 - l.score!))!;
  return {
    count: done.length,
    avgFirstChoiceSec: firstChoice == null ? null : Math.round(firstChoice),
    avgTotalSec: total == null ? null : Math.round(total),
    avgChanges: Math.round(changes * 10) / 10,
    avgConfidence: Math.round(confidence * 10) / 10,
    avgScore: Math.round(score),
    calibrationGap: Math.round(calibration),
    calibrationNote:
      done.length < 3
        ? "Complete at least 3 decisions to see a calibration pattern."
        : calibration > 15
          ? "Your confidence tends to run ahead of the quality of your reasoning. Before committing, name one thing that could make you wrong."
          : calibration < -15
            ? "Your reasoning is usually stronger than your confidence suggests. You can trust your judgement more."
            : "Your confidence is well calibrated to the quality of your reasoning.",
  };
}
