import { BaselineGate } from "@/components/baseline-gate";
import { TargetEditor } from "@/components/target-editor";
import { PageHeader } from "@/components/ui";
import { getUserState } from "@/lib/server/state";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "My goals" };

export default async function GoalsPage() {
  const t = await getT();
  const { state } = await getUserState();

  const header = (
    <PageHeader
      title={t("My personality goals")}
      description={t("Set how strong you want each skill to be. The programme will push your stories, scenarios and assessments toward what you choose.")}
    />
  );

  if (!state.baseline) return (<>{header}<BaselineGate feature="Personality goals" /></>);

  return (
    <>
      {header}
      <TargetEditor rows={state.skills} initialTargets={state.profile.skill_targets ?? null} initialPreset={state.profile.target_preset ?? null} />
    </>
  );
}
