import { securityQuestionsSet, recoveryStatus } from "@/lib/server/recovery";
import { getUserState } from "@/lib/server/state";
import { SecuritySettings } from "../security";
import { SettingsSub } from "../sub";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Password & security" };

export default async function Page() {
  const t = await getT();
  const { db, user, state } = await getUserState();
  const [recovery, questions] = await Promise.all([recoveryStatus(db, user.id), securityQuestionsSet(db, user.id)]);
  return (
    <SettingsSub title={t("Password & security")}>
      <SecuritySettings remaining={recovery.remaining} email={state.email ?? ""} questions={questions} />
    </SettingsSub>
  );
}
