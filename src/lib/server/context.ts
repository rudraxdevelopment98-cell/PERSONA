import "server-only";
import type { Db } from "@/lib/db/server";
import { userData } from "@/lib/ai/prompts";
import { DIMENSION_META } from "@/lib/domain/dimensions";
import { PHASES } from "@/lib/domain/programme";
import { todaysFocus, type UserState } from "./state";
import type { CheckinRow, DecisionLogRow } from "./types";

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

/**
 * Builds the personalisation context passed to the model: assessment results,
 * current scores, recent check-ins and practice feedback. User-authored text is
 * wrapped with userData() so it cannot act as instructions.
 */
export async function buildAIContext(
  db: Db,
  state: UserState,
  /** lean: a smaller context for quick feedback calls (cheaper; the essentials only). */
  opts: { includeJournal?: boolean; checkins?: number; lean?: boolean } = {},
): Promise<string> {
  const uid = state.userId;
  const [checkinsRes, scenariosRes, decisionsRes, exercisesRes, sessionsRes, journalRes] = await Promise.all([
    db
      .from("daily_checkins")
      .select("checkin_date, day_number, questions, answers, analysis")
      .eq("user_id", uid)
      .not("completed_at", "is", null)
      .order("checkin_date", { ascending: false })
      .limit(opts.checkins ?? 4),
    db.from("scenario_responses").select("skill, score, evaluation").eq("user_id", uid).not("score", "is", null).order("created_at", { ascending: false }).limit(opts.lean ? 2 : 5),
    db
      .from("decision_logs")
      .select("category, score, confidence, first_choice_ms, total_time_ms, choice_changes, evaluation")
      .eq("user_id", uid)
      .not("score", "is", null)
      .order("created_at", { ascending: false })
      .limit(5),
    db.from("exercise_completions").select("exercise_type, score, evaluation").eq("user_id", uid).not("score", "is", null).order("created_at", { ascending: false }).limit(5),
    db.from("daily_sessions").select("day_number, focus_skill, completed_at, challenge_status, challenge_notes").eq("user_id", uid).order("day_number", { ascending: false }).limit(5),
    opts.includeJournal && state.profile.coach_journal_access
      ? db.from("journal_entries").select("title, body, entry_type, created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(5)
      : Promise.resolve({ data: null }),
  ]);

  const focus = todaysFocus(state);
  const lines: string[] = [];

  lines.push(`## Programme`);
  lines.push(
    state.day === 0
      ? "The programme has not started yet."
      : `Day ${state.day} of 90 - Phase ${focus.phase.number} (${focus.phase.name}). Today's focus: ${focus.title} (${DIMENSION_META[focus.dimension].label}).`,
  );

  if (state.skills.length > 0) {
    lines.push(`\n## Current scores (0-100 development indicators; baseline -> current)`);
    for (const s of state.skills) lines.push(`- ${DIMENSION_META[s.dimension].label}: ${s.baseline} -> ${s.current}`);
    lines.push(`Weakest areas: ${state.weakest.map((d) => DIMENSION_META[d].label).join(", ")}`);
  }

  const dp = state.profile.development_profile;
  if (dp) {
    lines.push(`\n## Development profile`);
    lines.push(dp.summary);
    if (dp.behavioural_patterns.length) lines.push(`Patterns: ${dp.behavioural_patterns.slice(0, opts.lean ? 2 : 6).join("; ")}`);
    lines.push(`Growth areas: ${dp.growth_areas.map((g) => `${DIMENSION_META[g.dimension].label} (${g.likely_pattern})`).join("; ")}`);
  }

  if (state.baseline?.reflections) {
    lines.push(
      `\n## In their own words (assessment)\n${state.baseline.reflections.held_back ? `${userData("held back", clip(state.baseline.reflections.held_back, 800))}\n` : ""}${userData("90-day goal", clip(state.baseline.reflections.goal, 600))}`,
    );
  }

  const checkins = (checkinsRes.data ?? []) as Pick<CheckinRow, "checkin_date" | "day_number" | "questions" | "answers" | "analysis">[];
  if (checkins.length > 0) {
    lines.push(`\n## Recent check-ins (newest first)`);
    for (const c of checkins) {
      const qa = (c.questions ?? [])
        .map((q) => {
          const a = c.answers?.find((x) => x.id === q.id)?.value;
          return a == null || a === "" ? null : `Q: ${q.text}\nA: ${clip(String(a), opts.lean ? 240 : 500)}`;
        })
        .filter(Boolean)
        .join("\n");
      lines.push(`### Day ${c.day_number} (${c.checkin_date})`);
      lines.push(userData("check-in answers", qa));
      if (c.analysis) {
        lines.push(`Analysis: ${c.analysis.summary}`);
        if (c.analysis.patterns.length) lines.push(`Patterns noted: ${c.analysis.patterns.join("; ")}`);
      }
    }
  }

  const sessions = sessionsRes.data ?? [];
  if (sessions.length > 0) {
    lines.push(`\n## Recent sessions`);
    for (const s of sessions) {
      const notes = s.challenge_notes ? ` ${userData("challenge notes", clip(s.challenge_notes, 400))}` : "";
      lines.push(`- Day ${s.day_number}: ${DIMENSION_META[s.focus_skill as keyof typeof DIMENSION_META]?.label ?? s.focus_skill}; ${s.completed_at ? "completed" : "not completed"}; challenge ${s.challenge_status}.${notes}`);
    }
  }

  const feedback: string[] = [];
  for (const s of scenariosRes.data ?? []) feedback.push(`Scenario (${s.skill}) ${s.score}/100 - practise next: ${s.evaluation?.practise_next ?? ""}`);
  for (const e of exercisesRes.data ?? []) feedback.push(`Communication: ${e.exercise_type} ${e.score}/100 - practise next: ${e.evaluation?.practise_next ?? ""}`);
  for (const d of (decisionsRes.data ?? []) as Pick<DecisionLogRow, "category" | "score" | "confidence" | "first_choice_ms" | "evaluation">[]) {
    const secs = d.first_choice_ms != null ? Math.round(d.first_choice_ms / 1000) : null;
    feedback.push(
      `Decision (${d.category}) ${d.score}/100, confidence ${d.confidence}/10${secs != null ? `, first choice after ${secs}s` : ""}${d.evaluation?.biases_noticed.length ? `, biases: ${d.evaluation.biases_noticed.join(", ")}` : ""}`,
    );
  }
  if (feedback.length > 0) lines.push(`\n## Recent practice results\n${feedback.map((f) => `- ${f}`).join("\n")}`);

  const journal = journalRes.data ?? [];
  if (journal.length > 0) {
    lines.push(`\n## Recent journal entries (shared with coach by the user)`);
    for (const j of journal) lines.push(userData(`journal ${j.entry_type} ${String(j.created_at).slice(0, 10)}`, `${j.title}\n${clip(j.body, 1200)}`));
  }

  if (!opts.lean) lines.push(`\n## Programme phases\n${PHASES.map((p) => `${p.number}. ${p.name} (days ${p.days[0]}-${p.days[1]}): ${p.focus.map((f) => f.title).join(", ")}`).join("\n")}`);
  return lines.join("\n");
}
