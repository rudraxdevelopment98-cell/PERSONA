import { Card, CardHeader } from "@/components/ui";
import { DataForm } from "../data-form";
import { SettingsSub } from "../sub";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Your data" };

export default async function Page() {
  const t = await getT();
  return (
    <SettingsSub title={t("Your data")}>
      <Card>
        <CardHeader title={t("Your data")} description={t("Everything you have entered, and everything generated for you, belongs to you.")} />
        <div className="px-5 pb-5 pt-1">
          <DataForm />
        </div>
      </Card>
    </SettingsSub>
  );
}
