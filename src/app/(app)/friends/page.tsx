import Link from "next/link";
import { Bell, ChevronRight, Flag, Lock, Pencil, Plus, UserPlus, Users } from "lucide-react";
import { InviteBox } from "@/components/social";
import { FaceAvatar, MomentRings, NudgeButton, QuickCheer, WatchMoments } from "@/components/moments";
import { Alert, ButtonLink, Card, EmptyState, cx } from "@/components/ui";
import { requireUser } from "@/lib/db/server";
import { coverBg, streakMark } from "@/lib/domain/moments";
import { RACE_KINDS } from "@/lib/domain/social";
import { duoStreaks, doneToday, getProfileCard, momentFeed } from "@/lib/server/moments";
import { getSharing, listFriends, loadSnapshots, myCircles, myRaces, nameOf, pendingIncoming, unreadCount } from "@/lib/server/social";
import { suggestions } from "@/lib/server/discover";
import { PersonRow, UserSearch } from "@/components/discover";
import { PendingRequests } from "./requests";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Friends" };
export const dynamic = "force-dynamic";

const TABS = [
  { id: "friends", label: "Friends" },
  { id: "circles", label: "Circles" },
  { id: "races", label: "Races" },
] as const;

export default async function FriendsPage({ searchParams }: { searchParams: Promise<{ joined?: string; tab?: string }> }) {
  const t = await getT();
  const { user } = await requireUser();
  const sp = await searchParams;
  const tab = TABS.find((it) => it.id === sp.tab)?.id ?? "friends";
  const [friends, circles, races, sharing, unread, feed, card, name, mine, requests, suggested] = await Promise.all([
    listFriends(user.id),
    myCircles(user.id),
    myRaces(user.id),
    getSharing(user.id),
    unreadCount(user.id),
    momentFeed(user.id),
    getProfileCard(user.id),
    nameOf(user.id),
    loadSnapshots([user.id]),
    pendingIncoming(user.id),
    suggestions(user.id),
  ]);
  const ids = friends.map((f) => f.id);
  const [duos, today] = await Promise.all([duoStreaks(user.id, ids), doneToday(ids)]);
  const me = mine.get(user.id);
  const liveRaces = races.filter((r) => Date.parse(r.ends_at) > Date.now());
  const feedOf = new Map(feed.map((p) => [p.id, p]));
  const activeFriends = friends.filter((f) => f.view?.shared.includes("activity"));
  const showedUp = activeFriends.filter((f) => today.get(f.id)).length;
  // Longest friend streak first.
  const sorted = [...friends].sort((a, b) => (duos.get(b.id)?.streak ?? 0) - (duos.get(a.id)?.streak ?? 0));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold tracking-tight">{t("Friends")}</h1>
        <div className="flex items-center gap-1">
          <IconLink href="/inbox" label={t("Inbox")} badge={unread}>
            <Bell className="size-5" />
          </IconLink>
          <IconLink href="/friends/sharing" label={t("Privacy")}>
            <Lock className="size-5" />
          </IconLink>
          <IconLink href="/friends?tab=friends#invite" label={t("Add friends")}>
            <UserPlus className="size-5" />
          </IconLink>
        </div>
      </div>

      {sp.joined && <Alert tone="success">{t("You're connected! You can now see each other's shared progress.")}</Alert>}
      {sharing.paused && (
        <Alert tone="warning">{t("Sharing is paused - friends and circles can't see your progress or moments.")}{" "}
          <Link href="/friends/sharing" className="font-semibold underline">{t("Resume")}</Link>
        </Alert>
      )}

      {/* My profile card */}
      <section className="overflow-hidden rounded-3xl border border-line bg-surface">
        <div className="h-20" style={{ background: coverBg(card.cover) }} />
        <div className="flex items-end gap-3 px-4">
          <div className="-mt-9 shrink-0">
            <FaceAvatar name={name} emoji={card.avatar_emoji} cover={card.cover} size="lg" className="ring-4 ring-surface" />
          </div>
          <div className="min-w-0 flex-1 pt-2">
            <p className="truncate font-extrabold">{name}</p>
            <p className="truncate text-xs text-muted">{card.bio || t("Add a line about what you're working on")}</p>
          </div>
          <ButtonLink href="/friends/profile" variant="secondary" className="mb-1 h-8 px-3 text-xs">
            <Pencil className="size-3.5" />{" "}{t("Edit")}</ButtonLink>
        </div>
        {me && (
          <div className="grid grid-cols-4 gap-1 px-3 pb-4 pt-3 text-center">
            <Stat value={me.programme_day ? `${me.programme_day}` : "-"} label={t("Day")} />
            <Stat value={`🔥 ${me.streak}`} label={t("Streak")} />
            <Stat value={`${me.level}`} label={t(me.level_name ?? "")} />
            <Stat value={`${me.badges.length}`} label={t("Badges")} />
          </div>
        )}
      </section>

      <MomentRings feed={feed} me={{ name, emoji: card.avatar_emoji, cover: card.cover }} />

      {/* Tabs */}
      <nav className="flex rounded-2xl bg-bg p-1 text-sm font-semibold" aria-label={t("Friends sections")}>
        {TABS.map((it) => {
          const count = it.id === "friends" ? friends.length : it.id === "circles" ? circles.length : liveRaces.length;
          return (
            <Link
              key={it.id}
              href={`/friends?tab=${it.id}`}
              aria-current={tab === it.id ? "page" : undefined}
              className={cx("flex-1 rounded-xl py-2 text-center transition", tab === it.id ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink")}
            >
              {t(it.label)} <span className="text-xs font-normal text-muted">{count}</span>
            </Link>
          );
        })}
      </nav>

      {tab === "friends" && (
        <div className="space-y-4">
          <UserSearch />
          {requests.length > 0 && <PendingRequests requests={requests} />}
          {activeFriends.length > 0 && (
            <p className="text-sm text-muted">
              <b className="text-ink">{showedUp}</b> of {activeFriends.length}{" "}{t("friends showed up today")}</p>
          )}
          {friends.length === 0 ? (
            <Card>
              <EmptyState icon={<Users className="size-6" />} title={t("No friends yet")} description={t("Invite one person you trust. Friend streaks, moments and cheers start here.")} />
            </Card>
          ) : (
            <Card className="divide-y divide-line">
              {sorted.map((f) => {
                const fname = f.view?.display_name ?? f.name;
                const person = feedOf.get(f.id);
                const activity = f.view?.shared.includes("activity");
                const duo = activity ? duos.get(f.id) : undefined;
                const doneNow = activity ? today.get(f.id) : undefined;
                const face = <FaceAvatar name={fname} emoji={f.view?.avatar_emoji} cover={f.view?.cover} size="md" ring={person ? (person.allSeen ? "seen" : "new") : "none"} />;
                return (
                  <div key={f.id} className="flex items-center gap-3 px-3 py-3">
                    {person ? <WatchMoments person={person}>{face}</WatchMoments> : <Link href={`/friends/${f.id}`}>{face}</Link>}
                    <Link href={`/friends/${f.id}`} className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-bold">{fname}</span>
                        {duo && duo.streak > 0 && (
                          <span className="shrink-0 text-sm font-bold tabular-nums" title={t("Friend streak: days you both showed up")}>
                            🔥{duo.streak}
                            {streakMark(duo.streak) && streakMark(duo.streak) !== "🔥" ? streakMark(duo.streak) : ""}
                            {!(duo.todayMe && duo.todayThem) && " ⏳"}
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {!f.view
                          ? t("Sharing paused")
                          : person && !person.allSeen
                            ? t("New moment · tap the photo")
                            : doneNow === true
                              ? t("✓ Showed up today{0}", f.view.programme_day ? ` · Day ${f.view.programme_day}` : "")
                              : doneNow === false
                                ? duo && duo.streak > 0 && duo.todayMe
                                  ? t("Waiting for {0} to keep your streak", fname.split(" ")[0])
                                  : t("Not yet today")
                                : f.view.bio || (f.view.level ? t("Level {0} · {1}", f.view.level, t(f.view.level_name ?? "")) : t("Friend"))}
                      </span>
                    </Link>
                    {duo && duo.todayMe && !duo.todayThem ? <NudgeButton to={f.id} name={fname} /> : <QuickCheer to={f.id} name={fname} />}
                  </div>
                );
              })}
            </Card>
          )}
          <p className="px-1 text-xs text-muted">{t("🔥 Friend streak = days in a row you both checked in. ⏳ means one of you hasn't shown up today - tap it to nudge them.")}</p>
          {suggested.length > 0 && (
            <Card className="p-4">
              <p className="mb-1 flex items-center gap-1.5 text-sm font-bold"><UserPlus className="size-4 text-primary" /> {t("People you may know")}</p>
              <div className="divide-y divide-line">
                {suggested.map((p) => <PersonRow key={p.id} p={p} />)}
              </div>
            </Card>
          )}
          <div id="invite" className="scroll-mt-20">
            <InviteBox title={t("Add a friend · dono ko 7 din Pro")} text={t("Jab dost apna pehla episode poora karega, tum dono ko 7 din Pro free milega. Private link ya QR.")} />
          </div>
        </div>
      )}

      {tab === "circles" && (
        <div className="space-y-3">
          {circles.length === 0 && (
            <Card>
              <EmptyState icon={<Users className="size-6" />} title={t("No circles yet")} description={t("A circle is a small group - your hostel wing, team or batch - with a shared board, moments and races.")} />
            </Card>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {circles.map((c) => (
              <Link key={c.id} href={`/circles/${c.id}`} className="flex items-center gap-3 rounded-3xl border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:shadow-raised">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-3xl">{c.emoji || "👥"}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{c.name}</span>
                  <span className="text-xs text-muted">
                    {c.members}{" "}{t("members")}{c.live_races > 0 ? " " + t("· {0} live race{1} 🏁", c.live_races, c.live_races > 1 ? "s" : "") : ""}
                  </span>
                </span>
                <ChevronRight className="size-4 text-muted" />
              </Link>
            ))}
          </div>
          <ButtonLink href="/circles#new" variant="secondary" className="w-full">
            <Plus className="size-4" />{" "}{t("New circle")}</ButtonLink>
        </div>
      )}

      {tab === "races" && (
        <div className="space-y-3">
          {liveRaces.length === 0 && (
            <Card>
              <EmptyState icon={<Flag className="size-6" />} title={t("No races right now")} description={t("Open a friend's profile or a circle to start a friendly race.")} />
            </Card>
          )}
          {liveRaces.map((r) => {
            const daysLeft = Math.max(0, Math.ceil((Date.parse(r.ends_at) - Date.now()) / 86_400_000));
            return (
              <Link key={r.id} href={`/races/${r.id}`} className="flex items-center gap-3 rounded-3xl border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:shadow-raised">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-sun-soft text-2xl">🏁</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{t(r.title)}</span>
                  <span className="text-xs text-muted">
                    {t(RACE_KINDS.find((k) => k.id === r.kind)?.label ?? "")} · {daysLeft}{" "}{t("day")}{daysLeft === 1 ? "" : "s"}{" "}{t("left")}</span>
                </span>
                {!r.joined ? <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">{t("Join")}</span> : <ChevronRight className="size-4 text-muted" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

async function Stat({ value, label }: { value: string; label: string }) {
  const t = await getT();
  return (
    <div className="min-w-0 rounded-2xl bg-bg px-1 py-2">
      <p className="truncate text-base font-extrabold tabular-nums">{value}</p>
      <p className="truncate text-[11px] text-muted">{t(label)}</p>
    </div>
  );
}

async function IconLink({ href, label, badge = 0, children }: { href: string; label: string; badge?: number; children: React.ReactNode }) {
  const t = await getT();
  return (
    <Link href={href} aria-label={t(label)} title={t(label)} className="relative flex size-10 items-center justify-center rounded-full text-ink hover:bg-bg">
      {children}
      {badge > 0 && <span className="absolute right-1 top-1 min-w-4 rounded-full bg-coral px-1 text-center text-[10px] font-bold leading-4 text-white">{badge}</span>}
    </Link>
  );
}
