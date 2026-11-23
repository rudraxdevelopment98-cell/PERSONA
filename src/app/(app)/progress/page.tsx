import Link from "next/link";
import { BaselineGate } from "@/components/baseline-gate";
import { ScoreBars } from "@/components/score-bars";
import { Card, CardHeader, Delta, PageHeader, Stat, cx } from "@/components/ui";
import { DIMENSION_META, type Dimension } from "@/lib/domain/dimensions";
import { PROGRAMME_LENGTH } from "@/lib/domain/programme";
import { historyByDay, overallScore, strengthsAndGrowthAreas } from "@/lib/domain/scoring";
import { getUserState } from "@/lib/server/state";
import type { ScoreHistoryRow } from "@/lib/server/types";
import { OverallTrend, SkillTrend } from "./charts";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Progress Analytics" };

const fmt = (n: number | null) => (n == null ? "–" : Math.round(n));

export default async function ProgressPage() {
  const t = await getT();
  const { db, user, state } = await getUserState();
  const header = (
    <PageHeader
      title={t("Progress Analytics")}
      description={t("Only from what you actually did. Nothing is guessed.")}
    />
  );
  if (!state.baseline) return (<>{header}<BaselineGate feature="Progress tracking" /></>);

  const [{ data: hist }, { data: sessions }, { data: checkins }] = await Promise.all([
    db.from("personality_scores").select("dimension, score, source, recorded_at").eq("user_id", user.id).order("recorded_at").limit(5000),
    db.from("daily_sessions").select("day_number, completed_at, challenge_status").eq("user_id", user.id),
    db.from("daily_checkins").select("day_number").eq("user_id", user.id).not("completed_at", "is", null),
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
  const gain = overall - baselineOverall;
  const fmtGain = Math.abs(Math.round(gain * 10) / 10);

  return (
    <>
      {header}
      <div className="space-y-6">
        <Card className="grid grid-cols-2 gap-6 p-5 sm:grid-cols-4">
          <Stat label={t("Overall score")} value={overall} hint={<>{t("Baseline")}{" "}{baselineOverall} · <Delta value={overall - baselineOverall} /></>} />
          <Stat label={t("Sessions completed")} value={completedSessions} hint={t("{0} day{1} into the programme", state.day, state.day === 1 ? "" : "s")} />
          <Stat label={t("Challenges done")} value={challenges} hint={t("real-world")} />
          <Stat label={t("Consistency")} value={consistency == null ? "–" : `${Math.round(consistency)}%`} hint={t("completion since day 1")} />
        </Card>

        <Card className="space-y-3 p-5">
          <p className="text-lg font-extrabold leading-snug">
            {gain > 0.4 ? t("You are {0} points above where you started. 🎉", fmtGain) : gain < -0.4 ? t("A small dip of {0} points. Normal - keep going.", fmtGain) : t("You are right at your starting point. The climb starts now.")}
          </p>
          <div className="flex flex-wrap gap-2 text-sm">
            {strengths.slice(0, 2).map((s) => (
              <span key={s.dimension} className="rounded-full bg-accent-soft px-3 py-1 font-semibold text-accent">💪 {t(DIMENSION_META[s.dimension].label)} {s.current}</span>
            ))}
            {growth.slice(0, 2).map((s) => (
              <span key={s.dimension} className="rounded-full bg-sun-soft px-3 py-1 font-semibold text-warning">🌱 {t(DIMENSION_META[s.dimension].label)} {s.current}</span>
            ))}
          </div>
          <p className="text-xs text-muted">{t("💪 strongest · 🌱 getting extra practice")}</p>
        </Card>

        {history.length >= 2 && (
          <Card>
            <CardHeader title={t("Overall score over time")} />
            <OverallTrend history={history} baseline={baselineOverall} />
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title={t("Your 10 skills")} description={t("Bar = now · line = where you started")} />
            <div className="px-5 py-5">
              <ScoreBars rows={state.skills} />
            </div>
          </Card>
          {history.length >= 2 && (
            <Card>
              <SkillTrend history={history} baselines={baselines} />
            </Card>
          )}
        </div>

        <Card>
          <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
            <span>
              <span className="block font-semibold">{t("Score breakdown")}</span>
              <span className="block text-sm text-muted">{t("How each current score is built, and why it changed.")}</span>
            </span>
            <span className="text-muted group-open:rotate-90">›</span>
          </summary>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-2.5 font-medium">{t("Skill")}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{t("Baseline")}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{t("Self-report")}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{t("Demonstrated")}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{t("Consistency")}</th>
                  <th className="px-5 py-2.5 text-right font-medium">{t("Current")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {state.skills.map((s) => (
                  <tr key={s.dimension} className="align-top">
                    <td className="px-5 py-3">
                      <p className="font-medium">{t(DIMENSION_META[s.dimension].label)}</p>
                      <p className="mt-0.5 max-w-md text-xs leading-relaxed text-muted">{t(s.explanation ?? "")}</p>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{fmt(s.baseline)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{fmt(s.self_reported)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{fmt(s.demonstrated)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{s.dimension === "self_discipline" ? fmt(s.consistency) : <span className="text-muted">{t("n/a")}</span>}</td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums">{fmt(s.current)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-line px-5 py-3 text-sm">
            <Link href="/guide#scores" className="font-semibold text-primary underline-offset-2 hover:underline">{t("How scores work")} ›</Link>
          </p>
          </details>
        </Card>

        <Card>
          <CardHeader
            title={t("Daily activity")}
            description={t("Each square is one programme day.")}
            action={
              <div className="hidden items-center gap-3 text-xs text-muted sm:flex">
                <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-primary" />{" "}{t("Session")}</span>
                <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-primary/35" />{" "}{t("Check-in only")}</span>
                <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm border border-line bg-bg" />{" "}{t("Missed")}</span>
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
                  title={t("Day {0}: {1}", d, status === "session" ? `session completed${s?.challenge_status === "completed" ? ", challenge done" : ""}` : status === "checkin" ? "check-in only" : status)}
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
            <p className="px-5 pb-5 text-sm text-muted">{t("No sessions yet.")}</p>
          )}
        </Card>
      </div>
    </>
  );
}
