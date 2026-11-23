import { notFound } from "next/navigation";
import { ArrowLeft, Play } from "lucide-react";
import { BadgeIcon } from "@/components/badge-icon";
import { CheerBar, FriendMenu } from "@/components/social";
import { FaceAvatar, NudgeButton, WatchMoments } from "@/components/moments";
import { ButtonLink, Card, CardHeader } from "@/components/ui";
import { requireUser } from "@/lib/db/server";
import { DIMENSIONS, DIMENSION_META } from "@/lib/domain/dimensions";
import { coverBg, streakMark } from "@/lib/domain/moments";
import { filterSnapshot, SHARE_ITEM_IDS } from "@/lib/domain/social";
import { todayIn } from "@/lib/domain/programme";
import { badgeIcon, duoStreaks, momentFeed } from "@/lib/server/moments";
import { listFriends, refreshSnapshot } from "@/lib/server/social";
import { getPool } from "@/lib/db/pool";
import { RaceStarter } from "../../races/race-starter";
import type { Snapshot } from "@/lib/domain/social";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function FriendProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const { id } = await params;
  const { user } = await requireUser();
  const friends = await listFriends(user.id);
  const friend = friends.find((f) => f.id === id);
  if (!friend) notFound();

  await refreshSnapshot(user.id);
  const [[mine], duos, feed] = await Promise.all([
    getPool()
      .query("select *, last_active_date::text as last_active_date from public.share_snapshots where user_id = $1", [user.id])
      .then((r) => r.rows as Snapshot[]),
    duoStreaks(user.id, [id]),
    momentFeed(user.id, { userId: id }),
  ]);
  const me = filterSnapshot(mine, SHARE_ITEM_IDS, todayIn(mine.timezone));
  const them = friend.view;
  const name = them?.display_name ?? friend.name;
  const first = name.split(" ")[0];
  const person = feed[0];
  const activity = them?.shared.includes("activity");
  const duo = activity ? duos.get(id) : undefined;
  const shelf = them?.badges ? (them.pinned?.length ? them.pinned : them.badges.slice(0, 3)) : [];

  // Only compare what the friend shares; my side mirrors the same fields.
  const rows: { label: string; me: number; them: number }[] = [];
  if (activity) {
    rows.push({ label: "Current streak", me: me.streak ?? 0, them: them!.streak ?? 0 });
    rows.push({ label: "Best streak", me: me.best_streak ?? 0, them: them!.best_streak ?? 0 });
    rows.push({ label: "Sessions", me: me.sessions_completed ?? 0, them: them!.sessions_completed ?? 0 });
  }
  if (them?.shared.includes("xp")) rows.push({ label: "XP", me: me.xp ?? 0, them: them.xp ?? 0 });
  if (them?.shared.includes("challenges")) rows.push({ label: "Challenges", me: me.challenges_completed ?? 0, them: them.challenges_completed ?? 0 });
  if (them?.shared.includes("badges")) rows.push({ label: "Badges", me: me.badges?.length ?? 0, them: them.badges?.length ?? 0 });
  const skillKey = them?.shared.includes("growth") ? "growth" : them?.shared.includes("scores") ? "scores" : null;

  const face = <FaceAvatar name={name} emoji={them?.avatar_emoji} cover={them?.cover} size="xl" ring={person ? (person.allSeen ? "seen" : "new") : "none"} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <ButtonLink href="/friends" variant="ghost" className="-ml-2 h-8 px-2">
          <ArrowLeft className="size-4" />{" "}{t("Friends")}</ButtonLink>
        <FriendMenu userId={id} name={name} />
      </div>

      {/* Profile hero */}
      <section className="overflow-hidden rounded-3xl border border-line bg-surface">
        <div className="h-28" style={{ background: coverBg(them?.cover) }} />
        <div className="-mt-14 flex flex-col items-center px-5 pb-5 text-center">
          <div className="rounded-full bg-surface p-1">{person ? <WatchMoments person={person}>{face}</WatchMoments> : face}</div>
          <h1 className="mt-2 text-2xl font-extrabold">{name}</h1>
          {them?.level && (
            <p className="text-sm text-muted">{t("Level {0} · {1}", them.level, t(them.level_name ?? ""))}</p>
          )}
          {them?.bio && <p className="mt-2 max-w-sm text-sm">{them.bio}</p>}
          {!them && <p className="mt-2 text-sm text-muted">{t("{0} has paused sharing.", name)}</p>}

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {duo && (
              <span className="rounded-full bg-sun-soft px-3 py-1.5 text-sm font-bold text-warning">
                🔥 {duo.streak}{" "}{t("day friend streak")}{" "}{streakMark(duo.streak) !== "🔥" && streakMark(duo.streak)}
              </span>
            )}
            {person && (
              <WatchMoments person={person} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-sm font-bold text-white">
                <Play className="size-3.5 fill-current" /> {person.moments.length}{" "}{t("moment")}{person.moments.length > 1 ? "s" : ""}
              </WatchMoments>
            )}
          </div>
          {duo && (
            <p className="mt-2 text-xs text-muted">
              {duo.todayMe && duo.todayThem
                ? t("You both showed up today. Streak safe ✓")
                : duo.todayMe
                  ? t("You're done today - nudge {0} to keep it alive ⏳", first)
                  : duo.todayThem
                    ? t("{0} showed up today - your turn ⏳", first)
                    : t("Neither of you has checked in today yet.")}
            </p>
          )}
          {duo && duo.todayMe && !duo.todayThem && (
            <div className="mt-3">
              <NudgeButton to={id} name={name} variant="pill" />
            </div>
          )}
        </div>
        {activity && (
          <div className="grid grid-cols-3 gap-2 border-t border-line p-4 text-center">
            <Tile value={them!.programme_day ? `${them!.programme_day}/90` : "-"} label={t("Day")} />
            <Tile value={`🔥 ${them!.streak ?? 0}`} label={t("Streak")} />
            <Tile value={`${them!.sessions_completed ?? 0}`} label={t("Sessions")} />
          </div>
        )}
      </section>

      {/* Trophy shelf */}
      {shelf.length > 0 && (
        <Card>
          <CardHeader title={t("Trophy shelf")} description={them?.pinned?.length ? t("Badges {0} pinned", first) : t("{0}'s latest badges", first)} />
          <div className="grid grid-cols-3 gap-2 px-4 pb-4">
            {shelf.map((b) => (
              <div key={b.code} className="flex flex-col items-center gap-2 rounded-2xl bg-bg p-3 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                  <BadgeIcon name={badgeIcon(b.code)} className="size-6" />
                </span>
                <span className="text-xs font-semibold leading-tight">{t(b.title)}</span>
              </div>
            ))}
          </div>
          {(them?.badges?.length ?? 0) > shelf.length && <p className="px-5 pb-4 text-xs text-muted">+{them!.badges!.length - shelf.length}{" "}{t("more badges")}</p>}
        </Card>
      )}

      <Card className="p-4">
        <p className="mb-2 text-sm font-semibold">{t("Send {0} some energy", first)}</p>
        <CheerBar to={id} />
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader title={t("You vs {0}", first)} description={t("Only what they share. Everyone starts from a different place.")} />
          <div className="space-y-3 px-5 pb-5">
            {rows.map((r) => {
              const max = Math.max(1, r.me, r.them);
              return (
                <div key={r.label}>
                  <p className="mb-1 text-xs text-muted">{t(r.label)}</p>
                  <div className="flex items-center gap-2">
                    <span className={`w-10 text-right text-sm font-bold tabular-nums ${r.me > r.them ? "text-success" : ""}`}>{r.me}</span>
                    <span className="flex h-2 flex-1 overflow-hidden rounded-full bg-bg">
                      <span className="ml-auto h-full w-1/2">
                        <span className="ml-auto block h-full rounded-l-full bg-primary" style={{ width: `${(r.me / max) * 100}%` }} />
                      </span>
                      <span className="h-full w-1/2">
                        <span className="block h-full rounded-r-full bg-accent" style={{ width: `${(r.them / max) * 100}%` }} />
                      </span>
                    </span>
                    <span className={`w-10 text-sm font-bold tabular-nums ${r.them > r.me ? "text-success" : ""}`}>{r.them}</span>
                  </div>
                </div>
              );
            })}
            <div className="flex justify-between text-[11px] font-semibold uppercase text-muted">
              <span>{t("You")}</span>
              <span>{t(first)}</span>
            </div>
          </div>
        </Card>
      )}

      {skillKey && them && (
        <Card>
          <CardHeader title={skillKey === "growth" ? t("Growth since day 1") : t("Skill scores")} description={skillKey === "growth" ? t("Change from each person's own start - fairer than raw scores.") : t("Current 0-100 scores.")} />
          <div className="space-y-2 px-5 pb-5">
            {DIMENSIONS.filter((d) => them[skillKey]?.[d] != null).map((d) => {
              const a = me[skillKey]?.[d] ?? 0;
              const b = them[skillKey]![d];
              const fmt = (v: number) => (skillKey === "growth" ? `${v > 0 ? "+" : ""}${v}` : String(v));
              return (
                <div key={d} className="flex items-center gap-3 text-sm">
                  <span className="flex-1 truncate text-muted">{t(DIMENSION_META[d].short)}</span>
                  <span className="w-12 text-right font-bold">{fmt(a)}</span>
                  <span className="w-12 text-right font-bold text-accent">{fmt(b)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <RaceStarter friendId={id} name={name} />
    </div>
  );
}

async function Tile({ value, label }: { value: string; label: string }) {
  const t = await getT();
  return (
    <div className="rounded-2xl bg-bg py-2.5">
      <p className="text-lg font-extrabold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted">{t(label)}</p>
    </div>
  );
}
