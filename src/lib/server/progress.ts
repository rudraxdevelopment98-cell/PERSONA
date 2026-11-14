import "server-only";
import type { Db } from "@/lib/db/server";
import { isDimension, type Dimension } from "@/lib/domain/dimensions";
import { programmeDay, todayIn } from "@/lib/domain/programme";
import { awardAchievements } from "./gamification";
import { computeScores, type Observation } from "@/lib/domain/scoring";
import type { CheckinRow, SkillProgressRow } from "./types";

/** Converts check-in scale answers (1-10) tagged with a dimension into self-report observations. */
export function selfReportsFromCheckins(checkins: Pick<CheckinRow, "questions" | "answers" | "checkin_date">[]): Observation[] {
  const out: Observation[] = [];
  for (const c of checkins) {
    for (const q of c.questions ?? []) {
      if (q.type !== "scale" || !isDimension(q.dimension)) continue;
      const a = c.answers?.find((x) => x.id === q.id);
      const v = Number(a?.value);
      if (!Number.isFinite(v) || v < 1 || v > 10) continue;
      out.push({ dimension: q.dimension, score: ((v - 1) / 9) * 100, at: c.checkin_date });
    }
  }
  return out;
}

/**
 * Recomputes every dimension score from stored evidence, updates skill_progress
 * and appends a history row for each dimension whose score actually changed.
 */
export async function recomputeScores(db: Db, userId: string, source: string) {
  const [{ data: profile }, { data: progress }, { data: checkins }, { data: scenarios }, { data: decisions }, { data: exercises }, { data: sessions }] =
    await Promise.all([
      db.from("profiles").select("programme_start_date, timezone").eq("id", userId).single(),
      db.from("skill_progress").select("*").eq("user_id", userId),
      db.from("daily_checkins").select("questions, answers, checkin_date").eq("user_id", userId).not("completed_at", "is", null),
      db.from("scenario_responses").select("skill, score, created_at").eq("user_id", userId).not("score", "is", null),
      db.from("decision_logs").select("score, created_at").eq("user_id", userId).not("score", "is", null),
      db.from("exercise_completions").select("skill, score, created_at").eq("user_id", userId).not("score", "is", null),
      db.from("daily_sessions").select("completed_at, challenge_status").eq("user_id", userId),
    ]);

  const rows = (progress ?? []) as SkillProgressRow[];
  if (rows.length === 0) return [];

  const baseline: Partial<Record<Dimension, number>> = {};
  for (const r of rows) baseline[r.dimension] = Number(r.baseline);

  const demonstrated: Observation[] = [];
  for (const s of scenarios ?? []) {
    if (isDimension(s.skill)) demonstrated.push({ dimension: s.skill, score: s.score, at: s.created_at });
  }
  for (const d of decisions ?? []) {
    demonstrated.push({ dimension: "decision_making", score: d.score, at: d.created_at });
    demonstrated.push({ dimension: "independent_thinking", score: d.score, at: d.created_at });
  }
  for (const e of exercises ?? []) {
    if (!isDimension(e.skill)) continue;
    demonstrated.push({ dimension: e.skill, score: e.score, at: e.created_at });
    if (e.skill !== "communication") demonstrated.push({ dimension: "communication", score: e.score, at: e.created_at });
  }

  const today = todayIn(profile?.timezone ?? "UTC");
  const day = programmeDay(profile?.programme_start_date ?? null, today);
  const sessionRows = sessions ?? [];

  const scores = computeScores({
    baseline,
    selfReports: selfReportsFromCheckins((checkins ?? []) as CheckinRow[]),
    demonstrated,
    consistency: {
      daysElapsed: day,
      sessionsCompleted: sessionRows.filter((s) => s.completed_at).length,
      checkinsCompleted: (checkins ?? []).length,
      challengesCompleted: sessionRows.filter((s) => s.challenge_status === "completed").length,
    },
  });

  const previous = new Map(rows.map((r) => [r.dimension, Number(r.current)]));
  const now = new Date().toISOString();

  const { error } = await db.from("skill_progress").upsert(
    scores.map((s) => ({
      user_id: userId,
      dimension: s.dimension,
      baseline: s.baseline,
      current: s.current,
      self_reported: s.self_reported,
      demonstrated: s.demonstrated,
      consistency: s.consistency,
      evidence_count: s.evidence_count,
      explanation: s.explanation,
      updated_at: now,
    })),
  );
  if (error) throw error;

  const changed = scores.filter((s) => Math.abs((previous.get(s.dimension) ?? -1) - s.current) >= 0.1);
  if (changed.length > 0) {
    await db.from("personality_scores").insert(
      changed.map((s) => ({
        user_id: userId,
        dimension: s.dimension,
        score: s.current,
        self_reported: s.self_reported,
        demonstrated: s.demonstrated,
        consistency: s.consistency,
        source,
        explanation: s.explanation,
      })),
    );
  }

  await awardAchievements(db, userId, day);
  return scores;
}

export { awardAchievements } from "./gamification";
