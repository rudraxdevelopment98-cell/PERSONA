import { ThemeSetting } from "@/components/theme-toggle";
import { SettingsSub } from "../sub";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Appearance" };

export default async function Page() {
  const t = await getT();
  return (
    <SettingsSub title={t("Appearance")}>
      <ThemeSetting />
    </SettingsSub>
  );
}
