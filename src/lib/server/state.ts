import "server-only";
import type { Db } from "@/lib/db/server";
import { cache } from "react";
import { DIMENSIONS, type Dimension } from "@/lib/domain/dimensions";
import { focusForDay, phaseForDay, programmeDay, todayIn } from "@/lib/domain/programme";
import { requireUser } from "@/lib/db/server";
import type { AssessmentRow, ProfileRow, SkillProgressRow } from "./types";

export type UserState = {
  userId: string;
  email: string | undefined;
  profile: ProfileRow;
  baseline: AssessmentRow | null;
  skills: SkillProgressRow[];
  today: string;
  day: number;
  weakest: Dimension[];
};

export async function loadUserState(db: Db, userId: string, email?: string): Promise<UserState> {
  const [{ data: profile }, { data: baseline }, { data: skills }] = await Promise.all([
    db.from("profiles").select("*").eq("id", userId).single(),
    db
      .from("assessments")
      .select("*")
      .eq("user_id", userId)
      .eq("kind", "baseline")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db.from("skill_progress").select("*").eq("user_id", userId),
  ]);

  const p = (profile ?? {
    id: userId,
    display_name: null,
    programme_start_date: null,
    timezone: "UTC",
    development_profile: null,
    roadmap: null,
    coach_journal_access: false,
    created_at: new Date().toISOString(),
  }) as ProfileRow;

  const today = todayIn(p.timezone);
  const skillRows = ((skills ?? []) as SkillProgressRow[]).map((s) => ({
    ...s,
    baseline: Number(s.baseline),
    current: Number(s.current),
    self_reported: s.self_reported == null ? null : Number(s.self_reported),
    demonstrated: s.demonstrated == null ? null : Number(s.demonstrated),
    consistency: s.consistency == null ? null : Number(s.consistency),
  }));
  skillRows.sort((a, b) => DIMENSIONS.indexOf(a.dimension) - DIMENSIONS.indexOf(b.dimension));
  const weakest = [...skillRows].sort((a, b) => a.current - b.current).slice(0, 3).map((s) => s.dimension);

  return {
    userId,
    email,
    profile: p,
    baseline: (baseline as AssessmentRow | null) ?? null,
    skills: skillRows,
    today,
    day: programmeDay(p.programme_start_date, today),
    weakest,
  };
}

/** Request-scoped state for server components. */
export const getUserState = cache(async () => {
  const { db, user } = await requireUser();
  const state = await loadUserState(db, user.id, user.email);
  return { db, user, state };
});

export function todaysFocus(state: UserState) {
  const day = Math.max(1, state.day);
  return { day, phase: phaseForDay(day), ...focusForDay(day, state.weakest) };
}
