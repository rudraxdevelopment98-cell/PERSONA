import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Flag, Flame } from "lucide-react";
import { Avatar, CheerBar, InviteBox, ProgressTile } from "@/components/social";
import { Badge, ButtonLink, Card, CardHeader, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/db/server";
import { RACE_KINDS } from "@/lib/domain/social";
import { CHEERS, SocialError, circleBoard, nameOf } from "@/lib/server/social";
import { doneToday, getProfileCard, momentFeed } from "@/lib/server/moments";
import { circleWeek } from "@/lib/server/streaks";
import { FaceAvatar, MomentRings } from "@/components/moments";
import { RaceStarter } from "../../races/race-starter";
import { CircleAdmin, MemberActions } from "./circle-admin";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function CirclePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sort?: string }> }) {
  const t = await getT();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { user } = await requireUser();
  let board;
  try {
    board = await circleBoard(user.id, id);
  } catch (err) {
    if (err instanceof SocialError) notFound();
    throw err;
  }
  const { circle, members, cheers, races, myRole } = board;
  const [feed, card, myName, today, week] = await Promise.all([
    momentFeed(user.id, { circleId: id }),
    getProfileCard(user.id),
    nameOf(user.id),
    doneToday(members.filter((m) => m.isMe || m.view?.shared.includes("activity")).map((m) => m.id)),
    circleWeek(user.id, id),
  ]);
  const tracked = members.filter((m) => today.has(m.id));
  const doneCount = tracked.filter((m) => today.get(m.id)).length;
  const sort = sp.sort === "xp" ? "xp" : "week";
  // Members who don't share activity/xp sort last; ties keep join order.
  const score = (m: (typeof members)[number]) => (sort === "xp" ? (m.view?.xp ?? -1) : m.week ? m.week.sessions * 3 + m.week.checkins + m.week.challenges * 2 : -1);
  const sorted = [...members].sort((a, b) => score(b) - score(a));
  const live = races.filter((r) => Date.parse(r.ends_at) > Date.now());
  const past = races.filter((r) => Date.parse(r.ends_at) <= Date.now());
  const isAdmin = myRole === "owner" || myRole === "admin";

  return (
    <>
      <ButtonLink href="/circles" variant="ghost" className="mb-3 -ml-2 h-8 px-2"><ArrowLeft className="size-4" />{" "}{t("Circles")}</ButtonLink>
      <PageHeader eyebrow={t("{0} member{1}", members.length, members.length === 1 ? "" : "s")} title={`${circle.emoji ?? "👥"} ${circle.name}`} />
      <div className="mb-4 space-y-4">
        <MomentRings feed={feed} me={{ name: myName, emoji: card.avatar_emoji, cover: card.cover }} emptyHint={false} />
        {tracked.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold">
                  {doneCount === tracked.length ? t("Everyone showed up today! 🎉") : t("{0} of {1} showed up today", doneCount, tracked.length)}
                </p>
                <p className="text-xs text-muted">{t("Check in to light up your face for the group.")}</p>
              </div>
              <div className="flex -space-x-2">
                {tracked.slice(0, 8).map((m) => (
                  <span key={m.id} className={today.get(m.id) ? "" : "opacity-35 grayscale"} title={`${m.isMe ? "You" : m.name}${today.get(m.id) ? " ✓" : ""}`}>
                    <FaceAvatar name={m.name} emoji={m.view?.avatar_emoji} cover={m.view?.cover} size="sm" className="ring-2 ring-surface" />
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(doneCount / tracked.length) * 100}%` }} />
            </div>
          </Card>
        )}
        {week.sharing > 0 && week.checkins + week.sessions > 0 && (
          <Card className="p-4">
            <p className="text-sm font-bold">{t("📊 This week in {0}", circle.name)}</p>
            <div className="mt-3 flex items-end justify-between gap-1.5" aria-label={t("Members who showed up on each of the last 7 days")}>
              {week.days.map((d) => {
                const pct = week.sharing ? d.done / week.sharing : 0;
                const label = new Date(`${d.date}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "narrow", timeZone: "UTC" });
                return (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1" title={`${d.done}/${week.sharing}`}>
                    <div className="flex h-14 w-full items-end overflow-hidden rounded-lg bg-bg">
                      <div className={`w-full rounded-lg ${pct === 1 ? "bg-accent" : "bg-primary/60"}`} style={{ height: `${Math.max(pct * 100, d.done ? 12 : 0)}%` }} />
                    </div>
                    <span className="text-[10px] text-muted">{t(label)}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-bg py-2">
                <p className="font-extrabold tabular-nums">{week.checkins}</p>
                <p className="text-[11px] text-muted">check-ins</p>
              </div>
              <div className="rounded-xl bg-bg py-2">
                <p className="font-extrabold tabular-nums">{week.sessions}</p>
                <p className="text-[11px] text-muted">{t("episodes")}</p>
              </div>
              <div className="rounded-xl bg-bg py-2">
                <p className="font-extrabold tabular-nums">{week.fullHouse}/7</p>
                <p className="text-[11px] text-muted">{t("full-house days")}</p>
              </div>
            </div>
            {(week.topStreak || week.hype) && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                {week.topStreak && <span className="rounded-full bg-sun-soft px-3 py-1 text-warning">{t("👑 Streak leader: {0} · 🔥{1}", week.topStreak.name, week.topStreak.streak)}</span>}
                {week.hype && <span className="rounded-full bg-coral-soft px-3 py-1 text-coral">{t("📣 Hype person: {0} · {1} cheers", week.hype.name, week.hype.cheers)}</span>}
              </div>
            )}
          </Card>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title={t("Board")}
              description={t("Only what each member chooses to share.")}
              action={
                <div className="flex rounded-xl border border-line p-0.5 text-xs font-semibold">
                  <Link href={`/circles/${id}`} className={`rounded-lg px-2.5 py-1 ${sort === "week" ? "bg-primary-soft text-primary" : "text-muted"}`}>{t("This week")}</Link>
                  <Link href={`/circles/${id}?sort=xp`} className={`rounded-lg px-2.5 py-1 ${sort === "xp" ? "bg-primary-soft text-primary" : "text-muted"}`}>{t("All-time XP")}</Link>
                </div>
              }
            />
            <div className="divide-y divide-line p-2">
              {sorted.map((m, i) => (
                <div key={m.id} className="flex gap-3 px-3 py-3">
                  <span className="w-5 pt-3 text-center text-sm font-bold text-muted">{i + 1}</span>
                  <Avatar name={m.name} id={m.id} emoji={m.view?.avatar_emoji} cover={m.view?.cover} />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-bold">{m.isMe ? t("You") : m.name}</span>
                      {m.role !== "member" && <Badge tone={m.role === "owner" ? "accent" : "sky"}>{t(m.role)}</Badge>}
                      {!m.isMe && isAdmin && <MemberActions circleId={id} member={{ id: m.id, name: m.name, role: m.role }} myRole={myRole} />}
                    </div>
                    {m.view ? <ProgressTile view={m.view} week={m.week} compact /> : <p className="text-xs text-muted">{t("Not sharing right now.")}</p>}
                    {!m.isMe && <CheerBar to={m.id} circleId={id} />}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <RaceStarter circleId={id} name={circle.name} />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title={t("Races")} icon={<Flag className="mt-0.5 size-5 text-warning" />} />
            <div className="space-y-1 p-3">
              {races.length === 0 && <p className="px-2 pb-2 text-sm text-muted">{t("No races yet.")}</p>}
              {[...live, ...past.slice(0, 5)].map((r) => {
                const ended = Date.parse(r.ends_at) <= Date.now();
                return (
                  <Link key={r.id} href={`/races/${r.id}`} className="block rounded-xl px-2 py-2 hover:bg-bg">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{t(r.title)}</span>
                      <Badge tone={ended ? "neutral" : "success"}>{ended ? t("Finished") : t("Live")}</Badge>
                    </span>
                    <span className="text-xs text-muted">{t("{0} · {1} racing", RACE_KINDS.find((k) => k.id === r.kind)?.label ?? "", r.participants)}</span>
                  </Link>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title={t("Cheers")} icon={<Flame className="mt-0.5 size-5 text-coral" />} />
            <div className="space-y-2 p-4 pt-2">
              {cheers.length === 0 && <p className="text-sm text-muted">{t("Be the first to cheer someone on.")}</p>}
              {cheers.map((c, i) => (
                <p key={i} className="text-sm">
                  <span className="mr-1">{CHEERS[c.kind]?.emoji}</span>
                  <b>{c.from_name}</b> <span className="text-muted">to</span> <b>{c.to_name}</b>
                  {c.note && <span className="block pl-6 text-muted">&ldquo;{c.note}&rdquo;</span>}
                </p>
              ))}
            </div>
          </Card>

          {isAdmin && <InviteBox kind="circle" circleId={id} title={t("Invite to this circle")} text={t("Anyone with the link joins the circle and becomes your friend.")} />}
          <CircleAdmin circleId={id} name={circle.name} emoji={circle.emoji} myRole={myRole} />
        </div>
      </div>
    </>
  );
}
