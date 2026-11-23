import { pickSponsor } from "@/lib/server/sponsors";
import { SponsorCard } from "@/components/sponsor-card";
import { UsageChip } from "@/components/upgrade";
import { getPlan, usage } from "@/lib/server/plan";
import { FREE_LIMITS } from "@/lib/domain/plans";
import { BaselineGate } from "@/components/baseline-gate";
import { Badge, Card, CardHeader, PageHeader, Stat } from "@/components/ui";
import { DECISION_CATEGORIES, decisionStats } from "@/lib/domain/labs";
import { getUserState } from "@/lib/server/state";
import type { DecisionLogRow } from "@/lib/server/types";
import { DecisionLab } from "./lab";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Decision Lab" };

export default async function DecisionLabPage() {
  const t = await getT();
  const { db, user, state } = await getUserState();
  const [plan, used] = await Promise.all([getPlan(user.id), usage(user.id)]);
  const sponsor = await pickSponsor(user.id, "labs", { language: state.profile.language, day: state.today });
  const chip = plan.unlimitedAI ? null : <UsageChip used={used.decisions} limit={FREE_LIMITS.decisionsPerWeek} period="week" />;
  const header = (
    <PageHeader
      action={chip}
      title={t("Decision Lab")}
      description={t("Practise realistic decisions with real trade-offs. You are evaluated on how you reason - your criteria, alternatives, risks and ownership - not on picking a 'right' answer. Time to first choice and changes of mind are recorded to reveal hesitation patterns.")}
    />
  );
  if (!state.baseline) return (<>{header}<BaselineGate feature="The Decision Lab" /></>);

  const { data } = await db.from("decision_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
  const logs = (data ?? []) as DecisionLogRow[];
  const completed = logs.filter((l) => l.completed_at);
  const pending = logs.find((l) => !l.completed_at && Date.now() - Date.parse(l.created_at) < 86_400_000) ?? null;
  const stats = decisionStats(completed);

  return (
    <>
      {header}
      <div className="space-y-6">
        <DecisionLab pending={pending ? { id: pending.id, scenario: pending.scenario, category: pending.category, difficulty: pending.difficulty } : null} />
        {sponsor && <SponsorCard s={sponsor} />}

        <Card>
          <CardHeader title={t("Your decision patterns")} description={t("Calculated from your completed decisions only.")} />
          {stats ? (
            <div className="space-y-4 px-5 py-5">
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-5">
                <Stat label={t("Decisions")} value={stats.count} />
                <Stat label={t("Avg score")} value={stats.avgScore} hint={t("reasoning quality")} />
                <Stat label={t("Confidence")} value={`${stats.avgConfidence}/10`} />
                <Stat label={t("First choice")} value={stats.avgFirstChoiceSec != null ? `${stats.avgFirstChoiceSec}s` : "–"} hint="average" />
                <Stat label={t("Changes")} value={stats.avgChanges} hint={t("per decision")} />
              </div>
              <p className="rounded-md bg-bg px-4 py-3 text-sm leading-relaxed">{stats.calibrationNote}</p>
            </div>
          ) : (
            <p className="px-5 py-4 text-sm text-muted">{t("No completed decisions yet. Patterns appear after your first scenario.")}</p>
          )}
        </Card>

        {completed.length > 0 && (
          <Card>
            <CardHeader title={t("History")} />
            <ul className="divide-y divide-line">
              {completed.map((l) => {
                const option = l.scenario.options.find((o) => o.id === l.chosen_option);
                return (
                  <li key={l.id} className="px-5 py-3.5">
                    <details>
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{t(l.scenario.title)}</span>
                          <span className="text-xs text-muted">{t("{0} · {1} · confidence {2}/10", DECISION_CATEGORIES.find((c) => c.id === l.category)?.label ?? "", new Date(l.created_at).toLocaleDateString("en-GB"), l.confidence ?? "")}</span>
                        </span>
                        <Badge tone="primary">{l.score}/100</Badge>
                      </summary>
                      <div className="mt-3 space-y-2 text-sm leading-relaxed">
                        <p><span className="text-muted">{t("You chose:")}</span> {option?.text}</p>
                        <p><span className="text-muted">{t("Your reasoning:")}</span> {l.reasoning || <span className="text-muted">{t("🔒 Your own words were deleted after 48 hours. Only the insights are kept.")}</span>}</p>
                        {l.evaluation && (
                          <>
                            <p><span className="text-muted">{t("Feedback:")}</span> {t(l.evaluation.to_improve)}</p>
                            <p><span className="text-muted">{t("Practise next:")}</span> {t(l.evaluation.practise_next)}</p>
                          </>
                        )}
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
