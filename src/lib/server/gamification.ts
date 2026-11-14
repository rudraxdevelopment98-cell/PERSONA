import "server-only";
import type { Db } from "@/lib/db/server";
import { levelInfo, totalXp, type ActivityCounts } from "@/lib/domain/gamification";
import { PHASES, currentStreak } from "@/lib/domain/programme";

export type Stats = ActivityCounts & { completedDays: number[]; bestStreak: number; streak: number; xp: number; level: number };

export type AchievementDef = { code: string; title: string; description: string; icon: string; met: (s: Stats) => boolean };

const phaseDone = (s: Stats, n: number) => {
  const [from, to] = PHASES[n - 1].days;
  return s.completedDays.filter((d) => d >= from && d <= to).length >= 24;
};

/** Every badge, in display order. Earned only from recorded activity. */
export const ACHIEVEMENTS: AchievementDef[] = [
  { code: "baseline", title: "Baseline set", description: "Completed the initial assessment.", icon: "flag", met: (s) => s.assessments > 0 },
  { code: "first_checkin", title: "First check-in", description: "Completed your first daily check-in.", icon: "check", met: (s) => s.checkins > 0 },
  { code: "first_session", title: "First session", description: "Completed your first daily session.", icon: "book", met: (s) => s.sessionsCompleted > 0 },
  { code: "streak_3", title: "On a roll", description: "Three days in a row.", icon: "flame", met: (s) => s.bestStreak >= 3 },
  { code: "streak_7", title: "Seven-day streak", description: "Seven consecutive programme days.", icon: "flame", met: (s) => s.bestStreak >= 7 },
  { code: "first_voice", title: "Spoke it out", description: "Completed a voice practice.", icon: "mic", met: (s) => s.voiceExercises > 0 },
  { code: "challenges_5", title: "Out in the world", description: "Completed 5 real-world challenges.", icon: "target", met: (s) => s.challenges >= 5 },
  { code: "decisions_10", title: "Decision maker", description: "10 Decision Lab scenarios.", icon: "branch", met: (s) => s.decisions >= 10 },
  { code: "communication_10", title: "Finding your voice", description: "10 Communication Lab exercises.", icon: "chat", met: (s) => s.communication >= 10 },
  { code: "journal_10", title: "Reflective practice", description: "10 journal entries.", icon: "pen", met: (s) => s.journalEntries >= 10 },
  { code: "level_5", title: "Level 5", description: "Reached level 5.", icon: "star", met: (s) => s.level >= 5 },
  { code: "streak_21", title: "Habit formed", description: "21 consecutive programme days.", icon: "flame", met: (s) => s.bestStreak >= 21 },
  { code: "sessions_30", title: "Thirty sessions", description: "Completed 30 daily sessions.", icon: "book", met: (s) => s.sessionsCompleted >= 30 },
  { code: "phase_1", title: "Foundation complete", description: "24+ sessions in Phase 1.", icon: "trophy", met: (s) => phaseDone(s, 1) },
  { code: "phase_2", title: "Development complete", description: "24+ sessions in Phase 2.", icon: "trophy", met: (s) => phaseDone(s, 2) },
  { code: "phase_3", title: "Transformation complete", description: "24+ sessions in Phase 3.", icon: "trophy", met: (s) => phaseDone(s, 3) },
];

export async function loadStats(db: Db, userId: string, today: number): Promise<Stats> {
  const head = (table: string) => db.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId);
  const n = (r: { count: number | null }) => r.count ?? 0;
  const [assessments, checkins, scenarios, decisions, communication, voiceExercises, journalEntries, sessionsRes] = await Promise.all([
    head("assessments").eq("status", "completed").then(n),
    head("daily_checkins").not("completed_at", "is", null).then(n),
    head("scenario_responses").not("score", "is", null).then(n),
    head("decision_logs").not("score", "is", null).then(n),
    head("exercise_completions").not("score", "is", null).then(n),
    head("exercise_completions").not("score", "is", null).eq("input_mode", "voice").then(n),
    head("journal_entries").then(n),
    db.from("daily_sessions").select("day_number, completed_at, story_completed_at, challenge_status").eq("user_id", userId),
  ]);
  const sessions = sessionsRes.data ?? [];
  const completedDays = sessions
    .filter((s) => s.completed_at)
    .map((s) => s.day_number as number)
    .sort((a, b) => a - b);
  let run = 0;
  let bestStreak = 0;
  completedDays.forEach((d, i) => {
    run = i > 0 && d === completedDays[i - 1] + 1 ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
  });
  const counts: ActivityCounts = {
    assessments,
    checkins,
    storiesRead: sessions.filter((s) => s.story_completed_at).length,
    scenarios,
    sessionsCompleted: completedDays.length,
    challenges: sessions.filter((s) => s.challenge_status === "completed").length,
    decisions,
    communication,
    voiceExercises,
    journalEntries,
  };
  const xp = totalXp(counts);
  return { ...counts, completedDays, bestStreak, streak: currentStreak(completedDays, today), xp, level: levelInfo(xp).level };
}

/** Records newly earned badges. */
export async function awardAchievements(db: Db, userId: string, today = 90) {
  const stats = await loadStats(db, userId, today);
  const earned = ACHIEVEMENTS.filter((a) => a.met(stats)).map(({ code, title, description }) => ({ user_id: userId, code, title, description }));
  if (earned.length > 0) await db.from("achievements").upsert(earned, { onConflict: "user_id,code", ignoreDuplicates: true });
  return stats;
}

import { cache } from "react";
import { getUserState } from "./state";

/** Request-scoped stats + level for the signed-in user. */
export const getGamification = cache(async () => {
  const { db, user, state } = await getUserState();
  const stats = await loadStats(db, user.id, Math.max(1, state.day));
  return { stats, level: levelInfo(stats.xp) };
});
