import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Card, IconTile } from "@/components/ui";
import { recoveryStatus } from "@/lib/server/recovery";
import { WelcomeCodes } from "./codes";
import { getUserState } from "@/lib/server/state";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Welcome" };
export const dynamic = "force-dynamic";

/** Shown once after sign-up: recovery codes for resetting a forgotten password. */
export default async function WelcomePage() {
  const t = await getT();
  const { db, user } = await getUserState();
  if ((await recoveryStatus(db, user.id)).total > 0) redirect("/assessment");
  return (
    <Card className="mx-auto max-w-2xl p-6">
      <IconTile tone="accent" size="lg">
        <ShieldCheck className="size-6" />
      </IconTile>
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{t("Save your recovery codes")}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("If you ever forget your password, use one of these codes on the “Forgot password” page. Each code works once. Keep them somewhere safe - a notes app or password manager.")}{" "}<span className="font-semibold text-ink">{t("They will not be shown again.")}</span>
      </p>
      <WelcomeCodes email={user.email} />
    </Card>
  );
}
