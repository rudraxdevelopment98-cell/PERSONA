import { ScoreBars } from "@/components/score-bars";
import { Badge, Card, CardHeader } from "@/components/ui";
import type { DevelopmentProfile } from "@/lib/ai/schemas";
import { DIMENSION_META, DIMENSIONS, type Dimension } from "@/lib/domain/dimensions";
import { PHASES } from "@/lib/domain/programme";
import type { AssessmentDepth } from "@/lib/domain/assessment";
import { RegenerateProfile } from "./regenerate";

export function ProfileView({ profile }: { profile: DevelopmentProfile }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Summary" />
        <p className="px-5 py-4 text-sm leading-relaxed text-ink">{profile.summary}</p>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Strengths" />
          <ul className="divide-y divide-line">
            {profile.strengths.map((s) => (
              <li key={s.dimension} className="px-5 py-3.5">
                <Badge tone="success">{DIMENSION_META[s.dimension].label}</Badge>
                <p className="mt-1.5 text-sm leading-relaxed text-ink">{s.insight}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Growth areas" />
          <ul className="divide-y divide-line">
            {profile.growth_areas.map((g) => (
              <li key={g.dimension} className="px-5 py-3.5">
                <Badge tone="warning">{DIMENSION_META[g.dimension].label}</Badge>
                <p className="mt-1.5 text-sm leading-relaxed text-ink">{g.insight}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">Likely pattern: {g.likely_pattern}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {profile.behavioural_patterns.length > 0 && (
        <Card>
          <CardHeader title="Behavioural patterns to watch" />
          <ul className="list-disc space-y-1.5 py-4 pl-10 pr-5 text-sm leading-relaxed">
            {profile.behavioural_patterns.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader title="Your 90-day roadmap" description={`First week: ${profile.first_week_focus}`} />
        <div className="grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
          {PHASES.map((phase) => {
            const r = profile.roadmap.find((x) => x.phase === phase.number);
            return (
              <div key={phase.number} className="p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  Phase {phase.number} · Days {phase.days[0]}–{phase.days[1]}
                </p>
                <h3 className="mt-1 font-semibold">{phase.name}</h3>
                {r && (
                  <>
                    <p className="mt-2 text-sm leading-relaxed">{r.goal}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{r.personal_emphasis}</p>
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {r.milestones.map((m, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-2 size-1 shrink-0 rounded-full bg-muted" />
                          {m}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

const HOW: Record<AssessmentDepth, string> = {
  quick: "Each skill was measured with one real-life situation, scored 1–5. That's a quick first read - expect these to move as the app sees how you actually practise.",
  standard: "Each skill has one situation and two behavioural statements (one of them reverse-scored, so agreeing with it lowers the score), each scored 1–5.",
  deep: "Each dimension has three behavioural statements and one situation, each scored 1–5. Some statements are reverse-scored, so agreeing with them lowers the score.",
};

export function AssessmentResults({ scores, profile, depth = "deep" }: { scores: Record<Dimension, number>; profile: DevelopmentProfile | null; depth?: AssessmentDepth }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-5">
        <Card className="md:col-span-3">
          <CardHeader title="Baseline scores" description="0-100 development indicators" />
          <div className="px-5 py-5">
            <ScoreBars rows={DIMENSIONS.map((d) => ({ dimension: d, current: scores[d] }))} />
          </div>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader title="How these scores work" />
          <div className="space-y-3 px-5 py-4 text-sm leading-relaxed text-muted">
            <p>{HOW[depth]}</p>
            <p className="rounded-md bg-bg px-3 py-2 font-mono text-xs text-ink">score = (average item score − 1) ÷ 4 × 100</p>
            <p>Development indicators, not clinical measurements.</p>
          </div>
        </Card>
      </div>
      {profile ? <ProfileView profile={profile} /> : <RegenerateProfile />}
    </div>
  );
}
