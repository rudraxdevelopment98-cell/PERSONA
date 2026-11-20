import { ArrowLeft } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { requireUser } from "@/lib/db/server";
import { getPool } from "@/lib/db/pool";
import { badgeIcon, getProfileCard } from "@/lib/server/moments";
import { nameOf } from "@/lib/server/social";
import { ProfileEditor } from "./profile-editor";

export const metadata = { title: "Your profile" };
export const dynamic = "force-dynamic";

export default async function ProfileCardPage() {
  const { user } = await requireUser();
  const [card, name, badges] = await Promise.all([
    getProfileCard(user.id),
    nameOf(user.id),
    getPool()
      .query<{ code: string; title: string }>("select code, title from public.achievements where user_id = $1 order by earned_at desc", [user.id])
      .then((r) => r.rows),
  ]);
  return (
    <div className="space-y-4">
      <ButtonLink href="/friends" variant="ghost" className="-ml-2 h-8 px-2">
        <ArrowLeft className="size-4" /> Friends
      </ButtonLink>
      <ProfileEditor name={name} initial={card} badges={badges.map((b) => ({ ...b, icon: badgeIcon(b.code) }))} />
    </div>
  );
}
