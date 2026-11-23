import { pickSponsor } from "@/lib/server/sponsors";
import { SponsorCard } from "@/components/sponsor-card";
import { UsageChip } from "@/components/upgrade";
import { getPlan, usage } from "@/lib/server/plan";
import { FREE_LIMITS } from "@/lib/domain/plans";
import { BaselineGate } from "@/components/baseline-gate";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { COMMUNICATION_EXERCISES, EXERCISE_BY_ID } from "@/lib/domain/labs";
import { getUserState } from "@/lib/server/state";
import type { ExerciseRow } from "@/lib/server/types";
import { CommunicationLab } from "./lab";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Communication Lab" };

export default async function CommunicationLabPage() {
  const t = await getT();
  const { db, user, state } = await getUserState();
  const [plan, used] = await Promise.all([getPlan(user.id), usage(user.id)]);
  const sponsor = await pickSponsor(user.id, "labs", { language: state.profile.language, day: state.today });
  const chip = plan.unlimitedAI ? null : <UsageChip used={used.communication} limit={FREE_LIMITS.communicationPerWeek} period="week" />;
  const header = (
    <PageHeader
      action={chip}
      title={t("Communication Lab")}
      eyebrow={t("Practice")}
      description={t("Say no, disagree, take criticism - out loud or in writing. Each reply is scored on clarity, assertiveness, empathy and composure, and you get a stronger version in your own voice.")}
    />
  );
  if (!state.baseline) return (<>{header}<BaselineGate feature="The Communication Lab" /></>);

  const { data } = await db.from("exercise_completions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(60);
  const rows = (data ?? []) as ExerciseRow[];
  const completed = rows.filter((r) => r.completed_at);
  const pending = rows.find((r) => !r.completed_at && Date.now() - Date.parse(r.created_at) < 86_400_000) ?? null;

  const perType = COMMUNICATION_EXERCISES.map((e) => {
    const done = completed.filter((c) => c.exercise_type === e.id);
    const avg = done.length ? Math.round(done.reduce((a, b) => a + (b.score ?? 0), 0) / done.length) : null;
    return { ...e, count: done.length, avg };
  });

  return (
    <>
      {header}
      <div className="space-y-6">
        <CommunicationLab
          stats={perType.map(({ id, count, avg }) => ({ id, count, avg }))}
          pending={pending ? { id: pending.id, exercise_type: pending.exercise_type, prompt: pending.prompt } : null}
          language={state.profile.language}
        />
        {sponsor && <SponsorCard s={sponsor} />}

        {completed.length > 0 && (
          <Card>
            <CardHeader title={t("Previous exercises")} />
            <ul className="divide-y divide-line">
              {completed.map((c) => (
                <li key={c.id} className="px-5 py-3.5">
                  <details>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{t(c.prompt.title)}</span>
                        <span className="text-xs text-muted">
                          {t(EXERCISE_BY_ID.get(c.exercise_type)?.label ?? "")} · {new Date(c.created_at).toLocaleDateString("en-GB")}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        {c.input_mode === "voice" && <Badge tone="coral">{t("Voice")}</Badge>}
                        <Badge tone="accent">{c.score}/100</Badge>
                      </span>
                    </summary>
                    <div className="mt-3 space-y-2 text-sm leading-relaxed">
                      <p><span className="text-muted">{t("They said:")}</span>{" "}{t("“")}{t(c.prompt.they_say)}{t("”")}</p>
                      <p><span className="text-muted">{t("You said:")}</span> {t(c.response ?? "")}</p>
                      {c.evaluation && <p><span className="text-muted">{t("Stronger version:")}</span> {t(c.evaluation.stronger_version)}</p>}
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
