import { Card, CardHeader } from "@/components/ui";
import { getUserState } from "@/lib/server/state";
import { AccountForm } from "../account-form";
import { SettingsSub } from "../sub";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Account" };

export default async function Page() {
  const t = await getT();
  const { state } = await getUserState();
  return (
    <SettingsSub title={t("Account")}>
      <Card>
        <CardHeader title={t("Account")} />
        <div className="px-5 pb-5 pt-1">
          <AccountForm
            email={state.email ?? ""}
            displayName={state.profile.display_name ?? ""}
            timezone={state.profile.timezone}
            coachJournalAccess={state.profile.coach_journal_access}
            language={state.profile.language}
            startDate={state.profile.programme_start_date}
          />
        </div>
      </Card>
    </SettingsSub>
  );
}
