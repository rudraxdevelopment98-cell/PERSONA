import { ArrowLeft } from "lucide-react";
import { ButtonLink, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/db/server";
import { SHARE_ITEMS } from "@/lib/domain/social";
import { getSharing, listBlocked, myCircles } from "@/lib/server/social";
import { PushToggle } from "@/components/social";
import { SharingForm } from "./sharing-form";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Sharing & privacy" };
export const dynamic = "force-dynamic";

export default async function SharingPage() {
  const t = await getT();
  const { user } = await requireUser();
  const [sharing, circles, blocked] = await Promise.all([getSharing(user.id), myCircles(user.id), listBlocked(user.id)]);
  return (
    <>
      <ButtonLink href="/friends" variant="ghost" className="mb-3 -ml-2 h-8 px-2"><ArrowLeft className="size-4" />{" "}{t("Friends")}</ButtonLink>
      <PageHeader
        title={t("Sharing & privacy")}
        description={t("You decide exactly what friends and circles see. Your journal, assessment answers, check-in moods, coach chats and challenge notes are never shared.")}
      />
      <SharingForm
        items={SHARE_ITEMS.map((i) => ({ id: i.id, label: i.label, description: i.description }))}
        sharing={sharing}
        circles={circles.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji }))}
        blocked={blocked}
        push={<PushToggle />}
      />
    </>
  );
}
