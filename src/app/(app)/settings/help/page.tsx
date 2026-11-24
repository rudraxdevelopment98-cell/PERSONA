import { HelpContact } from "../help-contact";
import { SettingsSub } from "../sub";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Help & contact" };

export default async function Page() {
  const t = await getT();
  return (
    <SettingsSub title={t("Help & contact")}>
      <HelpContact />
    </SettingsSub>
  );
}
