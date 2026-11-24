import { Card } from "@/components/ui";
import { getUserState } from "@/lib/server/state";
import { getDiscovery } from "@/lib/server/discover";
import { OnboardProfile } from "./onboard";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Your profile" };
export const dynamic = "force-dynamic";

export default async function WelcomeProfilePage() {
  const t = await getT();
  const { user } = await getUserState();
  const current = await getDiscovery(user.id);
  return (
    <Card className="mx-auto max-w-lg p-6">
      <p className="text-xs font-bold uppercase tracking-wider text-accent">{t("One quick thing")}</p>
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight">{t("Your profile")}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("Pick a username and decide if your profile is public (others can find you) or private (friends only). You can change all of this any time in Settings.")}</p>
      <OnboardProfile current={current} />
    </Card>
  );
}
