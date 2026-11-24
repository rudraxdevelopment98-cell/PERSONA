import { getUserState } from "@/lib/server/state";
import { getDiscovery } from "@/lib/server/discover";
import { ProfilePrivacy } from "../profile-privacy";
import { SettingsSub } from "../sub";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Profile & privacy" };

export default async function Page() {
  const t = await getT();
  const { user } = await getUserState();
  const discovery = await getDiscovery(user.id);
  return (
    <SettingsSub title={t("Profile & privacy")}>
      <ProfilePrivacy current={discovery} />
    </SettingsSub>
  );
}
