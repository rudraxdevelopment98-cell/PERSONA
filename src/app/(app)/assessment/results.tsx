import { ScoreBars } from "@/components/score-bars";
import { Badge, Card, CardHeader } from "@/components/ui";
import type { DevelopmentProfile } from "@/lib/ai/schemas";
import { DIMENSION_META, DIMENSIONS, type Dimension } from "@/lib/domain/dimensions";
import { PHASES } from "@/lib/domain/programme";
import type { AssessmentDepth } from "@/lib/domain/assessment";
import { RegenerateProfile } from "./regenerate";
import { getT } from "@/lib/i18n/server";

export async function ProfileView({ profile }: { profile: DevelopmentProfile }) {
  const t = await getT();
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title={t("Summary")} />
        <p className="px-5 py-4 text-sm leading-relaxed text-ink">{profile.summary}</p>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title={t("Strengths")} />
          <ul className="divide-y divide-line">
            {profile.strengths.map((s) => (
              <li key={s.dimension} className="px-5 py-3.5">
                <Badge tone="success">{t(DIMENSION_META[s.dimension].label)}</Badge>
                <p className="mt-1.5 text-sm leading-relaxed text-ink">{t(s.insight)}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title={t("Growth areas")} />
          <ul className="divide-y divide-line">
            {profile.growth_areas.map((g) => (
              <li key={g.dimension} className="px-5 py-3.5">
                <Badge tone="warning">{t(DIMENSION_META[g.dimension].label)}</Badge>
                <p className="mt-1.5 text-sm leading-relaxed text-ink">{t(g.insight)}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{t("Likely pattern: {0}", g.likely_pattern)}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {profile.behavioural_patterns.length > 0 && (
        <Card>
          <CardHeader title={t("Behavioural patterns to watch")} />
          <ul className="list-disc space-y-1.5 py-4 pl-10 pr-5 text-sm leading-relaxed">
            {profile.behavioural_patterns.map((p, i) => (
              <li key={i}>{t(p)}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader title={t("Your 90-day roadmap")} description={t("First week: {0}", profile.first_week_focus)} />
        <details className="group border-t border-line">
        <summary className="cursor-pointer list-none px-5 py-3 text-sm font-semibold text-primary">{t("See all 3 phases")} ›</summary>
        <div className="grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
          {PHASES.map((phase) => {
            const r = profile.roadmap.find((x) => x.phase === phase.number);
            return (
              <div key={phase.number} className="p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">{t("Phase {0} · Days {1}–{2}", phase.number, phase.days[0], phase.days[1])}</p>
                <h3 className="mt-1 font-semibold">{t(phase.name)}</h3>
                {r && (
                  <>
                    <p className="mt-2 text-sm leading-relaxed">{t(r.goal)}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{t(r.personal_emphasis)}</p>
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {r.milestones.map((m, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-2 size-1 shrink-0 rounded-full bg-muted" />
                          {t(m)}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            );
          })}
        </div>
        </details>
      </Card>
    </div>
  );
}

const HOW: Record<AssessmentDepth, string> = {
  quick: "Each skill was measured with one real-life situation, scored 1–5. That's a quick first read - expect these to move as the app sees how you actually practise.",
  standard: "Each skill has one situation and two behavioural statements (one of them reverse-scored, so agreeing with it lowers the score), each scored 1–5.",
  deep: "Each dimension has three behavioural statements and one situation, each scored 1–5. Some statements are reverse-scored, so agreeing with them lowers the score.",
};

export async function AssessmentResults({ scores, profile, depth = "deep" }: { scores: Record<Dimension, number>; profile: DevelopmentProfile | null; depth?: AssessmentDepth }) {
  const t = await getT();
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-5">
        <Card className="md:col-span-3">
          <CardHeader title={t("Baseline scores")} description={t("0-100 development indicators")} />
          <div className="px-5 py-5">
            <ScoreBars rows={DIMENSIONS.map((d) => ({ dimension: d, current: scores[d] }))} />
          </div>
        </Card>
        <Card className="md:col-span-2">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-semibold">
              {t("How these scores work")} <span className="text-muted group-open:rotate-90">›</span>
            </summary>
            <div className="space-y-3 px-5 pb-4 text-sm leading-relaxed text-muted">
              <p>{t(HOW[depth])}</p>
              <p className="rounded-md bg-bg px-3 py-2 font-mono text-xs text-ink">{t("score = (average item score − 1) ÷ 4 × 100")}</p>
              <p>{t("Development indicators, not clinical measurements.")}</p>
            </div>
          </details>
        </Card>
      </div>
      {profile ? <ProfileView profile={profile} /> : <RegenerateProfile />}
    </div>
  );
}
