import { DIMENSIONS, DIMENSION_META, type Dimension } from "./dimensions";

/**
 * PERSONA 90 scoring engine.
 *
 * Every dimension score (0-100) blends three components:
 *
 *  1. Self-reported behaviour - the baseline assessment, updated by daily
 *     check-in ratings. The baseline counts as BASELINE_WEIGHT observations so a
 *     single good or bad day cannot swing the score.
 *  2. Demonstrated performance - rubric scores given to the user's actual
 *     reasoning in scenarios, the Decision Lab, the Communication Lab and
 *     session reflections. Only the most recent DEMONSTRATED_WINDOW pieces of
 *     evidence count, so the score tracks current ability.
 *  3. Consistency and completion - share of programme activities completed
 *     since day 1 (sessions, check-ins, real-world challenges). It measures
 *     follow-through, so it feeds the self-discipline score only, and only after
 *     CONSISTENCY_MIN_DAYS days, when a completion rate is meaningful. It is
 *     always reported as its own category.
 *
 * Weights are renormalised over the components that actually have data. The
 * demonstrated weight ramps up with evidence (full weight from 3 pieces) so a
 * single exercise does not dominate. Nothing is estimated or back-filled: with
 * no data, a component is simply absent.
 */

export const WEIGHTS = { self: 0.45, demonstrated: 0.55 } as const;
export const DISCIPLINE_CONSISTENCY_WEIGHT = 0.35;
export const CONSISTENCY_MIN_DAYS = 7;
export const BASELINE_WEIGHT = 3;
export const SELF_REPORT_WINDOW = 10;
export const DEMONSTRATED_WINDOW = 8;
export const DEMONSTRATED_FULL_WEIGHT_AT = 3;

export type Observation = { dimension: Dimension; score: number; at: string };

export type ConsistencyInput = {
  daysElapsed: number;
  sessionsCompleted: number;
  checkinsCompleted: number;
  challengesCompleted: number;
};

export type ScoringInput = {
  baseline: Partial<Record<Dimension, number | null>>;
  selfReports: Observation[];
  demonstrated: Observation[];
  consistency: ConsistencyInput;
};

export type DimensionScore = {
  dimension: Dimension;
  baseline: number;
  current: number;
  self_reported: number;
  demonstrated: number | null;
  consistency: number | null;
  evidence_count: number;
  explanation: string;
};

const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));
const round1 = (n: number) => Math.round(n * 10) / 10;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

function recent(obs: Observation[], dimension: Dimension, n: number): number[] {
  return obs
    .filter((o) => o.dimension === dimension && Number.isFinite(o.score))
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    .slice(0, n)
    .map((o) => clamp(o.score));
}

/** Completion rate since day 1: sessions count double, check-ins and challenges single. */
export function consistencyScore(c: ConsistencyInput): number | null {
  if (c.daysElapsed <= 0) return null;
  const possible = c.daysElapsed * 4;
  const achieved =
    Math.min(c.sessionsCompleted, c.daysElapsed) * 2 +
    Math.min(c.checkinsCompleted, c.daysElapsed) +
    Math.min(c.challengesCompleted, c.daysElapsed);
  return round1(clamp((achieved / possible) * 100));
}

export function computeScores(input: ScoringInput): DimensionScore[] {
  const consistency = consistencyScore(input.consistency);
  const out: DimensionScore[] = [];

  for (const d of DIMENSIONS) {
    const baseline = input.baseline[d];
    if (baseline == null) continue;

    const selfObs = recent(input.selfReports, d, SELF_REPORT_WINDOW);
    const self = (baseline * BASELINE_WEIGHT + selfObs.reduce((a, b) => a + b, 0)) / (BASELINE_WEIGHT + selfObs.length);

    const demoObs = recent(input.demonstrated, d, DEMONSTRATED_WINDOW);
    const demonstrated = demoObs.length > 0 ? mean(demoObs) : null;

    const useConsistency = d === "self_discipline" && consistency != null && input.consistency.daysElapsed >= CONSISTENCY_MIN_DAYS;
    const parts: { value: number; weight: number }[] = [{ value: self, weight: WEIGHTS.self }];
    if (demonstrated != null) {
      const ramp = Math.min(1, demoObs.length / DEMONSTRATED_FULL_WEIGHT_AT);
      parts.push({ value: demonstrated, weight: WEIGHTS.demonstrated * ramp });
    }
    if (useConsistency) parts.push({ value: consistency!, weight: DISCIPLINE_CONSISTENCY_WEIGHT });

    const totalWeight = parts.reduce((a, p) => a + p.weight, 0);
    const current = parts.reduce((a, p) => a + p.value * p.weight, 0) / totalWeight;

    out.push({
      dimension: d,
      baseline: round1(baseline),
      current: round1(clamp(current)),
      self_reported: round1(self),
      demonstrated: demonstrated == null ? null : round1(demonstrated),
      consistency,
      evidence_count: selfObs.length + demoObs.length,
      explanation: explain(d, baseline, round1(clamp(current)), self, selfObs.length, demonstrated, demoObs.length, d === "self_discipline" ? consistency : null, useConsistency),
    });
  }
  return out;
}

function explain(
  d: Dimension,
  baseline: number,
  current: number,
  self: number,
  selfN: number,
  demonstrated: number | null,
  demoN: number,
  consistency: number | null,
  consistencyApplied = false,
): string {
  const label = DIMENSION_META[d].label;
  const parts: string[] = [];
  parts.push(
    selfN > 0
      ? `Self-report ${round1(self)} (baseline ${round1(baseline)} blended with ${selfN} recent check-in rating${selfN === 1 ? "" : "s"}).`
      : `Self-report ${round1(baseline)} from your baseline assessment; no check-in ratings for ${label.toLowerCase()} yet.`,
  );
  parts.push(
    demonstrated != null
      ? `Demonstrated ${round1(demonstrated)} averaged over your last ${demoN} evaluated response${demoN === 1 ? "" : "s"}${demoN < DEMONSTRATED_FULL_WEIGHT_AT ? " (partial weight until 3 pieces of evidence)" : ""}.`
      : "No demonstrated evidence yet - complete scenarios or lab exercises that train this skill.",
  );
  if (consistency != null) {
    parts.push(
      consistencyApplied
        ? `Consistency ${consistency} from programme completion.`
        : `Consistency (${consistency}) starts counting after day ${CONSISTENCY_MIN_DAYS}.`,
    );
  }
  const delta = round1(current - baseline);
  parts.push(delta === 0 ? "Unchanged from baseline." : `${delta > 0 ? "+" : ""}${delta} vs baseline.`);
  return parts.join(" ");
}

export function overallScore(scores: Pick<DimensionScore, "current">[]): number | null {
  if (scores.length === 0) return null;
  return round1(mean(scores.map((s) => s.current)));
}

export function strengthsAndGrowthAreas<T extends { dimension: Dimension; current: number }>(
  scores: T[],
  n = 3,
): { strengths: T[]; growth: T[] } {
  const sorted = [...scores].sort((a, b) => b.current - a.current);
  return { strengths: sorted.slice(0, n), growth: sorted.slice(-n).reverse() };
}

/**
 * Turns the append-only score history into one point per calendar day:
 * each dimension's latest recorded score as of that day, carried forward.
 * Only days on which something was actually recorded produce a point.
 */
export function historyByDay(rows: { dimension: Dimension; score: number; recorded_at: string }[]) {
  const sorted = [...rows].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
  const latest = new Map<Dimension, number>();
  const days: { date: string; overall: number; scores: Partial<Record<Dimension, number>> }[] = [];
  for (const r of sorted) {
    latest.set(r.dimension, Number(r.score));
    const date = r.recorded_at.slice(0, 10);
    const snapshot = Object.fromEntries(latest) as Partial<Record<Dimension, number>>;
    const values = [...latest.values()];
    const point = { date, overall: round1(mean(values)), scores: snapshot };
    if (days.length && days[days.length - 1].date === date) days[days.length - 1] = point;
    else days.push(point);
  }
  return days;
}
