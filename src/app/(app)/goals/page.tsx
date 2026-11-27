import Link from "next/link";
import { Hexagon } from "lucide-react";
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
      <Link href="/goals/cockpit" className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-cyan-400/25 bg-[#070b17] px-4 py-3 text-white transition hover:border-cyan-300/50">
        <span className="flex items-center gap-2.5">
          <Hexagon className="size-5 text-cyan-300" />
          <span className="text-sm font-bold">{t("Open cockpit view")}</span>
        </span>
        <span className="text-xs font-semibold text-cyan-300/80">{t("HUD")}</span>
      </Link>
      <TargetEditor rows={state.skills} initialTargets={state.profile.skill_targets ?? null} initialPreset={state.profile.target_preset ?? null} />
    </>
  );
}
