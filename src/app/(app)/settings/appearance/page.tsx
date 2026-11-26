import { ThemeSetting } from "@/components/theme-toggle";
import { DialThemePicker } from "@/components/dial-theme-picker";
import { Card, CardHeader } from "@/components/ui";
import { SettingsSub } from "../sub";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Appearance" };

export default async function Page() {
  const t = await getT();
  return (
    <SettingsSub title={t("Appearance")}>
      <ThemeSetting />
      <Card className="mt-6">
        <CardHeader title={t("Skill dial style")} description={t("Pick the dial you like for your skills on the Progress page.")} />
        <div className="px-5 pb-5">
          <DialThemePicker />
        </div>
      </Card>
    </SettingsSub>
  );
}
