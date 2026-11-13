import Link from "next/link";
import { ArrowRight, Award, Check, Circle } from "lucide-react";
import { BaselineGate } from "@/components/baseline-gate";
import { ScoreBars } from "@/components/score-bars";
import { Badge, ButtonLink, Card, CardHeader, Delta, PageHeader, Stat, cx } from "@/components/ui";
import { DIMENSION_META } from "@/lib/domain/dimensions";
import { PHASES, PROGRAMME_LENGTH, currentStreak } from "@/lib/domain/programme";
import { overallScore } from "@/lib/domain/scoring";
import { getUserState, todaysFocus } from "@/lib/server/state";
import type { AchievementRow, CheckinRow, SessionRow } from "@/lib/server/types";

export const metadata = { title: "Dashboard" };

function Step({ done, active, label, detail }: { done: boolean; active: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span
        className={cx(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
          done ? "border-success bg-success text-white" : active ? "border-primary text-primary" : "border-line-strong text-muted",
        )}
      >
        {done ? <Check className="size-3" strokeWidth={3} /> : active ? <Circle className="size-2 fill-current" /> : null}
      </span>
      <div className="min-w-0">
        <p className={cx("text-sm", done ? "text-muted" : "font-medium text-ink")}>{label}</p>
        <p className="text-xs text-muted">{detail}</p>
      </div>
    </li>
  );
}

export default async function Dashboard() {
  const { supabase, user, state } = await getUserState();
  const name = state.profile.display_name || "there";

  if (!state.baseline) {
    return (
      <>
        <PageHeader title={`Welcome, ${name}`} description="Your programme starts with a short assessment of how you currently think and act." />
        <BaselineGate feature="Your 90-day programme" />
      </>
    );
  }

  const focus = todaysFocus(state);
  const [{ data: checkin }, { data: session }, { data: sessions }, { data: achievements }] = await Promise.all([
    supabase.from("daily_checkins").select("completed_at, analysis").eq("user_id", user.id).eq("checkin_date", state.today).maybeSingle(),
    supabase
      .from("daily_sessions")
      .select("id, story_completed_at, scenarios_completed_at, challenge_status, completed_at, introduction")
      .eq("user_id", user.id)
      .eq("day_number", state.day)
      .maybeSingle(),
    supabase.from("daily_sessions").select("day_number, completed_at, challenge_status").eq("user_id", user.id),
    supabase.from("achievements").select("code, title, description, earned_at").eq("user_id", user.id).order("earned_at", { ascending: false }).limit(4),
  ]);

  const c = checkin as Pick<CheckinRow, "completed_at" | "analysis"> | null;
  const s = session as Pick<SessionRow, "id" | "story_completed_at" | "scenarios_completed_at" | "challenge_status" | "completed_at" | "introduction"> | null;
  const completedDays = (sessions ?? []).filter((x) => x.completed_at).map((x) => x.day_number as number);
  const challengesDone = (sessions ?? []).filter((x) => x.challenge_status === "completed").length;
  const overall = overallScore(state.skills);
  const baselineOverall = overallScore(state.skills.map((k) => ({ current: k.baseline })));
  const streak = currentStreak(completedDays, state.day);

  const steps = [
    { label: "Daily check-in", detail: "5–7 questions · about 3 min", done: Boolean(c?.completed_at) },
    { label: "Read today's story", detail: "About 10 min", done: Boolean(s?.story_completed_at) },
    { label: "Interactive scenarios", detail: "3 scenarios · about 7 min", done: Boolean(s?.scenarios_completed_at) },
    { label: "Reflection", detail: "About 3 min", done: Boolean(s?.completed_at) },
    { label: "Real-world challenge", detail: s?.challenge_status === "skipped" ? "Skipped" : "Do it today, then record it", done: s?.challenge_status === "completed" },
  ];
  const nextIndex = steps.findIndex((x) => !x.done);
  const allDone = nextIndex === -1;

  return (
    <>
      <PageHeader
        title={`Good to see you, ${name}`}
        description={
          <>
            Day {state.day} of {PROGRAMME_LENGTH} · Phase {focus.phase.number}, {focus.phase.name}
          </>
        }
        action={
          !allDone && (
            <ButtonLink href="/today">
              {nextIndex === 0 ? "Start today's check-in" : "Continue today"} <ArrowRight className="size-4" />
            </ButtonLink>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Today"
            description={
              <>
                Focus: <span className="text-ink">{focus.title}</span> · {DIMENSION_META[focus.dimension].label}
              </>
            }
            action={focus.personalised ? <Badge tone="primary">Personalised</Badge> : undefined}
          />
          <div className="grid gap-6 px-5 py-4 sm:grid-cols-2">
            <ol>
              {steps.map((st, i) => (
                <Step key={st.label} label={st.label} detail={st.detail} done={st.done} active={i === nextIndex} />
              ))}
            </ol>
            <div className="rounded-md bg-bg p-4">
              {c?.analysis ? (
                <>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">From today&apos;s check-in</p>
                  <p className="mt-2 text-sm leading-relaxed">{c.analysis.observation}</p>
                  <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted">Try today</p>
                  <p className="mt-1 text-sm leading-relaxed">{c.analysis.suggestion_for_today}</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">How today works</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    Your check-in answers shape today&apos;s story, scenarios and challenge. Allow about 30 minutes, plus the challenge itself.
                  </p>
                </>
              )}
              {allDone && <p className="mt-3 text-sm font-medium text-success">Everything for today is done.</p>}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="grid grid-cols-2 gap-5">
            <Stat label="Overall" value={overall ?? "–"} hint={overall != null && baselineOverall != null ? <Delta value={overall - baselineOverall} /> : null} />
            <Stat label="Streak" value={streak} hint={streak === 1 ? "day" : "days"} />
            <Stat label="Sessions" value={completedDays.length} hint={`of ${state.day} day${state.day === 1 ? "" : "s"} so far`} />
            <Stat label="Challenges" value={challengesDone} hint="completed" />
          </div>
          <Link href="/progress" className="mt-5 flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            View progress <ArrowRight className="size-3.5" />
          </Link>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Skills" description="Current score; the tick marks your baseline." />
          <div className="px-5 py-5">
            <ScoreBars rows={state.skills} />
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Roadmap" />
            <div className="space-y-4 px-5 py-4">
              {PHASES.map((p) => {
                const pct = Math.max(0, Math.min(100, ((state.day - p.days[0] + 1) / 30) * 100));
                const current = state.day >= p.days[0] && state.day <= p.days[1];
                return (
                  <div key={p.number}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span className={current ? "font-medium" : "text-muted"}>{p.name}</span>
                      <span className="text-xs tabular-nums text-muted">
                        {p.days[0]}–{p.days[1]}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-primary-soft">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              <Link href="/programme" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                Full programme <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </Card>

          <Card>
            <CardHeader title="Achievements" />
            {(achievements ?? []).length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted">Achievements appear here as you complete activities.</p>
            ) : (
              <ul className="divide-y divide-line">
                {(achievements as AchievementRow[]).map((a) => (
                  <li key={a.code} className="flex items-start gap-3 px-5 py-3">
                    <Award className="mt-0.5 size-4 shrink-0 text-muted" strokeWidth={1.75} />
                    <div>
                      <p className="text-sm font-medium">{a.title}</p>
                      <p className="text-xs text-muted">{a.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
