import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isDimension, type Dimension } from "@/lib/domain/dimensions";
import { PHASES, programmeDay, todayIn } from "@/lib/domain/programme";
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
export async function recomputeScores(supabase: SupabaseClient, userId: string, source: string) {
  const [{ data: profile }, { data: progress }, { data: checkins }, { data: scenarios }, { data: decisions }, { data: exercises }, { data: sessions }] =
    await Promise.all([
      supabase.from("profiles").select("programme_start_date, timezone").eq("id", userId).single(),
      supabase.from("skill_progress").select("*").eq("user_id", userId),
      supabase.from("daily_checkins").select("questions, answers, checkin_date").eq("user_id", userId).not("completed_at", "is", null),
      supabase.from("scenario_responses").select("skill, score, created_at").eq("user_id", userId).not("score", "is", null),
      supabase.from("decision_logs").select("score, created_at").eq("user_id", userId).not("score", "is", null),
      supabase.from("exercise_completions").select("skill, score, created_at").eq("user_id", userId).not("score", "is", null),
      supabase.from("daily_sessions").select("completed_at, challenge_status").eq("user_id", userId),
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

  const { error } = await supabase.from("skill_progress").upsert(
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
    await supabase.from("personality_scores").insert(
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

  await awardAchievements(supabase, userId);
  return scores;
}

type Rule = { code: string; title: string; description: string; met: boolean };

/** Achievements are derived only from stored activity, so they can never be earned artificially. */
export async function awardAchievements(supabase: SupabaseClient, userId: string) {
  const head = (table: string) => supabase.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId);
  const n = (r: { count: number | null }) => r.count ?? 0;

  const [assessments, checkins, decisions, exercises, journal, sessionsRes] = await Promise.all([
    head("assessments").eq("status", "completed").then(n),
    head("daily_checkins").not("completed_at", "is", null).then(n),
    head("decision_logs").not("score", "is", null).then(n),
    head("exercise_completions").not("score", "is", null).then(n),
    head("journal_entries").then(n),
    supabase.from("daily_sessions").select("day_number, completed_at, challenge_status").eq("user_id", userId),
  ]);

  const sessions = sessionsRes.data ?? [];
  const completedDays = sessions.filter((s) => s.completed_at).map((s) => s.day_number as number).sort((a, b) => a - b);
  let streak = 0;
  let best = 0;
  for (let i = 0; i < completedDays.length; i++) {
    streak = i > 0 && completedDays[i] === completedDays[i - 1] + 1 ? streak + 1 : 1;
    best = Math.max(best, streak);
  }
  const challenges = sessions.filter((s) => s.challenge_status === "completed").length;
  const phaseDone = (n: number) => {
    const [from, to] = PHASES[n - 1].days;
    return completedDays.filter((d) => d >= from && d <= to).length >= 24;
  };

  const rules: Rule[] = [
    { code: "baseline", title: "Baseline set", description: "Completed the initial assessment.", met: assessments > 0 },
    { code: "first_checkin", title: "First check-in", description: "Completed your first daily check-in.", met: checkins > 0 },
    { code: "first_session", title: "First session", description: "Completed your first daily learning session.", met: completedDays.length > 0 },
    { code: "streak_7", title: "Seven-day streak", description: "Completed sessions on 7 consecutive programme days.", met: best >= 7 },
    { code: "sessions_30", title: "Thirty sessions", description: "Completed 30 daily sessions.", met: completedDays.length >= 30 },
    { code: "challenges_5", title: "Out in the world", description: "Completed 5 real-world challenges.", met: challenges >= 5 },
    { code: "decisions_10", title: "Decision maker", description: "Worked through 10 Decision Lab scenarios.", met: decisions >= 10 },
    { code: "communication_10", title: "Finding your voice", description: "Completed 10 Communication Lab exercises.", met: exercises >= 10 },
    { code: "journal_10", title: "Reflective practice", description: "Wrote 10 journal entries.", met: journal >= 10 },
    { code: "phase_1", title: "Foundation complete", description: "Completed at least 24 sessions in Phase 1.", met: phaseDone(1) },
    { code: "phase_2", title: "Development complete", description: "Completed at least 24 sessions in Phase 2.", met: phaseDone(2) },
    { code: "phase_3", title: "Transformation complete", description: "Completed at least 24 sessions in Phase 3.", met: phaseDone(3) },
  ];

  const earned = rules.filter((r) => r.met).map(({ code, title, description }) => ({ user_id: userId, code, title, description }));
  if (earned.length > 0) {
    await supabase.from("achievements").upsert(earned, { onConflict: "user_id,code", ignoreDuplicates: true });
  }
}
