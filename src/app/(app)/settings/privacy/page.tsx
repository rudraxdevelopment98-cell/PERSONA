import { Card, CardHeader } from "@/components/ui";
import { getUserState } from "@/lib/server/state";
import { CoachJournalToggle } from "../data-form";
import { SettingsSub } from "../sub";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Coach & journal privacy" };

export default async function Page() {
  const t = await getT();
  const { state } = await getUserState();
  return (
    <SettingsSub title={t("Coach & journal privacy")}>
      <Card>
        <CardHeader title={t("Coach & journal privacy")} />
        <div className="px-5 pb-5 pt-1">
          <CoachJournalToggle initial={state.profile.coach_journal_access} />
        </div>
      </Card>
    </SettingsSub>
  );
}
