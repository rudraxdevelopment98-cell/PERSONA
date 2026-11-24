import { Card, CardHeader } from "@/components/ui";
import { LifePicker } from "@/components/life-picker";
import { getUserState } from "@/lib/server/state";
import { SettingsSub } from "../sub";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Your life" };

export default async function Page() {
  const t = await getT();
  const { state } = await getUserState();
  return (
    <SettingsSub title={t("Your life")}>
      <Card>
        <CardHeader title={t("Your life")} description={t("Kahaniyan, scenarios aur labs inhi areas se aate hain.")} />
        <div className="px-5 pb-5">
          <LifePicker variant="plain" initialStage={state.profile.life_stage ?? null} initialAreas={state.profile.life_areas ?? []} />
        </div>
      </Card>
    </SettingsSub>
  );
}
