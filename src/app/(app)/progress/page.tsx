import { BaselineGate } from "@/components/baseline-gate";
import { ScoreBars } from "@/components/score-bars";
import { Badge, Card, CardHeader, Delta, PageHeader, Stat, cx } from "@/components/ui";
import { DIMENSION_META, type Dimension } from "@/lib/domain/dimensions";
import { PROGRAMME_LENGTH } from "@/lib/domain/programme";
import { CONSISTENCY_MIN_DAYS, DEMONSTRATED_FULL_WEIGHT_AT, WEIGHTS, DISCIPLINE_CONSISTENCY_WEIGHT, historyByDay, overallScore, strengthsAndGrowthAreas } from "@/lib/domain/scoring";
import { getUserState } from "@/lib/server/state";
import type { ScoreHistoryRow } from "@/lib/server/types";
import { OverallTrend, SkillTrend } from "./charts";

export const metadata = { title: "Progress Analytics" };

const fmt = (n: number | null) => (n == null ? "–" : Math.round(n));

export default async function ProgressPage() {
  const { supabase, user, state } = await getUserState();
  const header = (
    <PageHeader
      title="Progress Analytics"
      description="Every number here comes from activity you have actually recorded. Nothing is estimated or back-filled - empty areas fill in as you practise."
    />
  );
  if (!state.baseline) return (<>{header}<BaselineGate feature="Progress tracking" /></>);

  const [{ data: hist }, { data: sessions }, { data: checkins }] = await Promise.all([
    supabase.from("personality_scores").select("dimension, score, source, recorded_at").eq("user_id", user.id).order("recorded_at").limit(5000),
    supabase.from("daily_sessions").select("day_number, completed_at, challenge_status").eq("user_id", user.id),
    supabase.from("daily_checkins").select("day_number").eq("user_id", user.id).not("completed_at", "is", null),
  ]);

  const history = historyByDay(((hist ?? []) as ScoreHistoryRow[]).map((r) => ({ ...r, score: Number(r.score) })));
  const overall = overallScore(state.skills)!;
  const baselineOverall = overallScore(state.skills.map((s) => ({ current: s.baseline })))!;
  const { strengths, growth } = strengthsAndGrowthAreas(state.skills);
  const baselines = Object.fromEntries(state.skills.map((s) => [s.dimension, s.baseline])) as Partial<Record<Dimension, number>>;

  const sessionByDay = new Map((sessions ?? []).map((s) => [s.day_number as number, s]));
  const checkinDays = new Set((checkins ?? []).map((c) => c.day_number as number));
  const completedSessions = (sessions ?? []).filter((s) => s.completed_at).length;
  const challenges = (sessions ?? []).filter((s) => s.challenge_status === "completed").length;
  const consistency = state.skills[0]?.consistency ?? null;

  return (
    <>
      {header}
      <div className="space-y-6">
        <Card className="grid grid-cols-2 gap-6 p-5 sm:grid-cols-4">
          <Stat label="Overall score" value={overall} hint={<>Baseline {baselineOverall} · <Delta value={overall - baselineOverall} /></>} />
          <Stat label="Sessions completed" value={completedSessions} hint={`${state.day} day${state.day === 1 ? "" : "s"} into the programme`} />
          <Stat label="Challenges done" value={challenges} hint="real-world" />
          <Stat label="Consistency" value={consistency == null ? "–" : `${Math.round(consistency)}%`} hint="completion since day 1" />
        </Card>

        <Card>
          <CardHeader title="Overall score over time" description="Average of all ten skills, on each day a score changed." />
          <OverallTrend history={history} baseline={baselineOverall} />
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Baseline vs current" description="Bar = current; tick = baseline." />
            <div className="px-5 py-5">
              <ScoreBars rows={state.skills} />
            </div>
          </Card>
          <Card>
            <SkillTrend history={history} baselines={baselines} />
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader title="Current strengths" />
            <ul className="divide-y divide-line">
              {strengths.map((s) => (
                <li key={s.dimension} className="flex items-center justify-between px-5 py-3 text-sm">
                  {DIMENSION_META[s.dimension].label}
                  <span className="font-medium tabular-nums">{s.current}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Growth areas" description="Your programme gives these extra practice." />
            <ul className="divide-y divide-line">
              {growth.map((s) => (
                <li key={s.dimension} className="flex items-center justify-between px-5 py-3 text-sm">
                  {DIMENSION_META[s.dimension].label}
                  <span className="font-medium tabular-nums">{s.current}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card>
          <CardHeader title="Score breakdown" description="How each current score is built, and why it changed." />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-2.5 font-medium">Skill</th>
                  <th className="px-3 py-2.5 text-right font-medium">Baseline</th>
                  <th className="px-3 py-2.5 text-right font-medium">Self-report</th>
                  <th className="px-3 py-2.5 text-right font-medium">Demonstrated</th>
                  <th className="px-3 py-2.5 text-right font-medium">Consistency</th>
                  <th className="px-5 py-2.5 text-right font-medium">Current</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {state.skills.map((s) => (
                  <tr key={s.dimension} className="align-top">
                    <td className="px-5 py-3">
                      <p className="font-medium">{DIMENSION_META[s.dimension].label}</p>
                      <p className="mt-0.5 max-w-md text-xs leading-relaxed text-muted">{s.explanation}</p>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{fmt(s.baseline)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{fmt(s.self_reported)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{fmt(s.demonstrated)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{s.dimension === "self_discipline" ? fmt(s.consistency) : <span className="text-muted">n/a</span>}</td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums">{fmt(s.current)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-5 py-4 text-xs leading-relaxed text-muted">
            <p>
              <span className="font-medium text-ink">Self-reported behaviour</span> ({WEIGHTS.self * 100}%): your baseline blended with your daily check-in ratings.{" "}
              <span className="font-medium text-ink">Demonstrated performance</span> ({WEIGHTS.demonstrated * 100}%): rubric scores for your reasoning in scenarios and labs, reaching full weight after {DEMONSTRATED_FULL_WEIGHT_AT} pieces of evidence.{" "}
              <span className="font-medium text-ink">Consistency</span>: completion of sessions, check-ins and challenges since day 1. It measures follow-through, so it counts towards self-discipline only ({DISCIPLINE_CONSISTENCY_WEIGHT * 100}% weight, from day {CONSISTENCY_MIN_DAYS}). Weights are shared out among the components that have data.
              These are development indicators, not clinical measurements.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Daily activity"
            description="Each square is one programme day."
            action={
              <div className="hidden items-center gap-3 text-xs text-muted sm:flex">
                <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-primary" /> Session</span>
                <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-primary/35" /> Check-in only</span>
                <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm border border-line bg-bg" /> Missed</span>
              </div>
            }
          />
          <div className="grid grid-cols-10 gap-1.5 p-5 sm:grid-cols-15">
            {Array.from({ length: PROGRAMME_LENGTH }, (_, i) => i + 1).map((d) => {
              const s = sessionByDay.get(d);
              const status = s?.completed_at ? "session" : checkinDays.has(d) ? "checkin" : d < state.day ? "missed" : d === state.day ? "today" : "future";
              return (
                <div
                  key={d}
                  title={`Day ${d}: ${status === "session" ? `session completed${s?.challenge_status === "completed" ? ", challenge done" : ""}` : status === "checkin" ? "check-in only" : status}`}
                  className={cx(
                    "flex aspect-square items-center justify-center rounded-sm text-[10px] tabular-nums",
                    status === "session" && "bg-primary text-white",
                    status === "checkin" && "bg-primary/35 text-ink",
                    status === "missed" && "border border-line bg-bg text-muted",
                    status === "today" && "border-2 border-primary text-ink",
                    status === "future" && "border border-dashed border-line text-muted/60",
                  )}
                >
                  {d}
                </div>
              );
            })}
          </div>
          {state.day > 0 && completedSessions === 0 && (
            <p className="px-5 pb-5 text-sm text-muted">
              No sessions completed yet. <Badge tone="primary">Tip</Badge> Today&apos;s session takes about 30 minutes.
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
