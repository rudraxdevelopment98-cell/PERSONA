import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Avatar, CheerBar, FriendMenu, ProgressTile } from "@/components/social";
import { ButtonLink, Card, CardHeader, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/db/server";
import { DIMENSIONS, DIMENSION_META } from "@/lib/domain/dimensions";
import { filterSnapshot, SHARE_ITEM_IDS } from "@/lib/domain/social";
import { todayIn } from "@/lib/domain/programme";
import { listFriends, refreshSnapshot } from "@/lib/server/social";
import { getPool } from "@/lib/db/pool";
import { RaceStarter } from "../../races/race-starter";
import type { Snapshot } from "@/lib/domain/social";

export const dynamic = "force-dynamic";

export default async function ComparePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireUser();
  const friends = await listFriends(user.id);
  const friend = friends.find((f) => f.id === id);
  if (!friend) notFound();

  await refreshSnapshot(user.id);
  const [mine] = (await getPool().query("select *, last_active_date::text as last_active_date from public.share_snapshots where user_id = $1", [user.id])).rows as Snapshot[];
  const me = filterSnapshot(mine, SHARE_ITEM_IDS, todayIn(mine.timezone));
  const them = friend.view;
  const name = them?.display_name ?? friend.name;

  // Only compare what the friend shares; my side mirrors the same fields.
  const rows: { label: string; me: number | string; them: number | string; higherIsBetter?: boolean }[] = [];
  if (them?.shared.includes("activity")) {
    rows.push({ label: "Programme day", me: me.programme_day ?? 0, them: them.programme_day ?? 0 });
    rows.push({ label: "Current streak", me: me.streak ?? 0, them: them.streak ?? 0, higherIsBetter: true });
    rows.push({ label: "Best streak", me: me.best_streak ?? 0, them: them.best_streak ?? 0, higherIsBetter: true });
    rows.push({ label: "Sessions completed", me: me.sessions_completed ?? 0, them: them.sessions_completed ?? 0, higherIsBetter: true });
  }
  if (them?.shared.includes("xp")) rows.push({ label: "XP", me: me.xp ?? 0, them: them.xp ?? 0, higherIsBetter: true });
  if (them?.shared.includes("challenges")) rows.push({ label: "Challenges", me: me.challenges_completed ?? 0, them: them.challenges_completed ?? 0, higherIsBetter: true });
  if (them?.shared.includes("badges")) rows.push({ label: "Badges", me: me.badges?.length ?? 0, them: them.badges?.length ?? 0, higherIsBetter: true });

  const skillKey = them?.shared.includes("growth") ? "growth" : them?.shared.includes("scores") ? "scores" : null;

  return (
    <>
      <ButtonLink href="/friends" variant="ghost" className="mb-3 -ml-2 h-8 px-2"><ArrowLeft className="size-4" /> Friends</ButtonLink>
      <PageHeader title={`You & ${name}`} description="Side by side, using only what they share. Compare to stay motivated - everyone starts from a different place." action={<FriendMenu userId={id} name={name} />} />
      <div className="space-y-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <Avatar name={name} id={id} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold">{name}</p>
              {them ? <ProgressTile view={them} week={friend.week} /> : <p className="text-sm text-muted">{name} has paused sharing.</p>}
            </div>
          </div>
          <div className="mt-4 border-t border-line pt-4"><CheerBar to={id} /></div>
        </Card>

        {rows.length > 0 && (
          <Card>
            <CardHeader title="Head to head" />
            <div className="p-3">
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 gap-y-1 px-2 text-sm">
                <span />
                <span className="text-right text-xs font-bold uppercase text-muted">You</span>
                <span className="text-right text-xs font-bold uppercase text-muted">{name.split(" ")[0]}</span>
                {rows.map((r) => {
                  const lead = r.higherIsBetter && typeof r.me === "number" && typeof r.them === "number" ? Math.sign(r.me - r.them) : 0;
                  return (
                    <div key={r.label} className="contents">
                      <span className="border-t border-line py-2 text-muted">{r.label}</span>
                      <span className={`border-t border-line py-2 text-right font-bold ${lead > 0 ? "text-success" : ""}`}>{r.me}</span>
                      <span className={`border-t border-line py-2 text-right font-bold ${lead < 0 ? "text-success" : ""}`}>{r.them}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        )}

        {skillKey && them && (
          <Card>
            <CardHeader title={skillKey === "growth" ? "Growth since day 1" : "Skill scores"} description={skillKey === "growth" ? "Change from each person's own starting point - a fairer comparison than raw scores." : "Current 0-100 scores."} />
            <div className="space-y-2 p-5 pt-3">
              {DIMENSIONS.filter((d) => them[skillKey]?.[d] != null).map((d) => {
                const a = me[skillKey]?.[d] ?? 0;
                const b = them[skillKey]![d];
                const fmt = (v: number) => (skillKey === "growth" ? `${v > 0 ? "+" : ""}${v}` : String(v));
                return (
                  <div key={d} className="flex items-center gap-3 text-sm">
                    <span className="w-32 shrink-0 text-muted">{DIMENSION_META[d].short}</span>
                    <span className="w-12 text-right font-bold">{fmt(a)}</span>
                    <span className="h-1.5 flex-1 rounded-full bg-bg" />
                    <span className="w-12 font-bold">{fmt(b)}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <RaceStarter friendId={id} name={name} />
      </div>
    </>
  );
}
