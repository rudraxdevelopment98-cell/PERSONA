import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BaselineGate } from "@/components/baseline-gate";
import { NodeController } from "@/components/node-controller";
import { PageHeader } from "@/components/ui";
import { getUserState } from "@/lib/server/state";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Personality cockpit" };

export default async function CockpitPage() {
  const t = await getT();
  const { state } = await getUserState();

  const header = (
    <div>
      <Link href="/goals" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-ink">
        <ArrowLeft className="size-4" /> {t("My personality goals")}
      </Link>
      <PageHeader title={t("Personality cockpit")} description={t("Tap a node, turn the dial. Set how strong you want each skill — it shapes your stories and assessments.")} />
    </div>
  );

  if (!state.baseline) return (<>{header}<BaselineGate feature="Personality goals" /></>);

  return (
    <>
      {header}
      <NodeController rows={state.skills} initialTargets={state.profile.skill_targets ?? null} initialPreset={state.profile.target_preset ?? null} />
    </>
  );
}
