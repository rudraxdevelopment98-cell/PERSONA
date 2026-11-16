import Link from "next/link";
import { Bell, ChevronRight, Flag, Lock, Plus, Users } from "lucide-react";
import { Avatar, CheerBar, FriendMenu, InviteBox, ProgressTile } from "@/components/social";
import { Alert, ButtonLink, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/db/server";
import { RACE_KINDS } from "@/lib/domain/social";
import { getSharing, listFriends, myCircles, myRaces, unreadCount } from "@/lib/server/social";

export const metadata = { title: "Friends" };
export const dynamic = "force-dynamic";

export default async function FriendsPage({ searchParams }: { searchParams: Promise<{ joined?: string }> }) {
  const { user } = await requireUser();
  const [friends, circles, races, sharing, unread, sp] = await Promise.all([
    listFriends(user.id),
    myCircles(user.id),
    myRaces(user.id),
    getSharing(user.id),
    unreadCount(user.id),
    searchParams,
  ]);
  const liveRaces = races.filter((r) => Date.parse(r.ends_at) > Date.now());

  return (
    <>
      <PageHeader
        eyebrow="Together"
        title="Friends"
        description="Grow alongside people you trust. They only see what you choose to share - never your journal, answers or coach chats."
        action={
          <div className="flex gap-2">
            <ButtonLink href="/inbox" variant="secondary">
              <Bell className="size-4" /> Inbox{unread > 0 && <span className="rounded-full bg-coral px-1.5 text-[11px] text-white">{unread}</span>}
            </ButtonLink>
            <ButtonLink href="/friends/sharing" variant="secondary">
              <Lock className="size-4" /> Privacy
            </ButtonLink>
          </div>
        }
      />

      <div className="space-y-6">
        {sp.joined && <Alert tone="success">You&apos;re connected! You can now see each other&apos;s shared progress.</Alert>}
        {sharing.paused && (
          <Alert tone="warning">
            Sharing is paused - friends and circles can&apos;t see your progress. <Link href="/friends/sharing" className="font-semibold underline">Resume</Link>
          </Alert>
        )}

        <InviteBox title="Invite a friend" text="Private link · no public profiles" />

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">Your friends ({friends.length})</h2>
          {friends.length === 0 ? (
            <Card>
              <EmptyState icon={<Users className="size-6" />} title="No friends yet" description="Share your invite link to add one." />
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {friends.map((f) => {
                const name = f.view?.display_name ?? f.name;
                return (
                  <Card key={f.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar name={name} id={f.id} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <Link href={`/friends/${f.id}`} className="truncate font-bold hover:underline">{name}</Link>
                          <FriendMenu userId={f.id} name={name} />
                        </div>
                        <div className="mt-2">
                          {f.view ? <ProgressTile view={f.view} week={f.week} compact /> : <p className="text-sm text-muted">{name} has paused sharing.</p>}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
                      <CheerBar to={f.id} />
                      <Link href={`/friends/${f.id}`} className="shrink-0 text-xs font-semibold text-primary">Compare</Link>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Circles" description="Small groups with a shared board" action={<ButtonLink href="/circles" variant="ghost" className="h-8 px-2">All <ChevronRight className="size-4" /></ButtonLink>} />
            <div className="space-y-1 p-3">
              {circles.length === 0 && <p className="px-2 pb-2 text-sm text-muted">No circles yet.</p>}
              {circles.slice(0, 4).map((c) => (
                <Link key={c.id} href={`/circles/${c.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-bg">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-accent-soft text-lg">{c.emoji || "👥"}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{c.name}</span>
                  <span className="text-xs text-muted">{c.members} members</span>
                </Link>
              ))}
              <ButtonLink href="/circles#new" variant="secondary" className="mt-2 w-full"><Plus className="size-4" /> New circle</ButtonLink>
            </div>
          </Card>
          <Card>
            <CardHeader title="Races" description="Friendly, time-boxed competitions" />
            <div className="space-y-1 p-3">
              {liveRaces.length === 0 && <p className="px-2 pb-2 text-sm text-muted">No races yet.</p>}
              {liveRaces.slice(0, 5).map((r) => (
                <Link key={r.id} href={`/races/${r.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-bg">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-sun-soft text-warning"><Flag className="size-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{r.title}</span>
                    <span className="text-xs text-muted">{RACE_KINDS.find((k) => k.id === r.kind)?.label} · ends {new Date(r.ends_at).toLocaleDateString()}</span>
                  </span>
                  {!r.joined && <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary">Join</span>}
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
