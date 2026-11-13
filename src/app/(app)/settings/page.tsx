import { PageHeader } from "@/components/ui";
import { getUserState } from "@/lib/server/state";
import { SettingsForm } from "./form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { state } = await getUserState();
  return (
    <>
      <PageHeader title="Settings" description="Your profile, privacy and data." />
      <SettingsForm
        email={state.email ?? ""}
        displayName={state.profile.display_name ?? ""}
        timezone={state.profile.timezone}
        coachJournalAccess={state.profile.coach_journal_access}
        startDate={state.profile.programme_start_date}
      />
    </>
  );
}
