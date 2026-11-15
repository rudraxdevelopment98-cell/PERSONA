import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge, ButtonLink, Card, CardHeader, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/db/server";
import { userDetail } from "@/lib/server/admin";
import { UserActions } from "../../admin-ui";

export const metadata = { title: "User · Admin" };

const LABELS: Record<string, string> = {
  checkins: "Check-ins",
  sessions: "Sessions",
  decisions: "Decision Lab",
  communication: "Communication Lab",
  coach_messages: "Coach messages",
  journal_entries: "Journal entries",
  badges: "Badges",
  friends: "Friends",
  circles: "Circles",
  reports_against: "Reports against",
  reports_made: "Reports made",
  devices: "Signed-in devices",
};

export default async function AdminUser({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user: me } = await requireUser();
  const d = await userDetail(id);
  if (!d) notFound();
  const u = d.user;
  const max = Math.max(1, ...d.days.map((x) => x.n));
  return (
    <>
      <ButtonLink href="/admin/users" variant="ghost" className="mb-3 -ml-2 h-8 px-2"><ArrowLeft className="size-4" /> Users</ButtonLink>
      <PageHeader
        eyebrow="User"
        title={u.name}
        description={
          <>
            {u.email} · joined {new Date(u.joined).toLocaleDateString()} · {u.language} · {u.timezone}
          </>
        }
        action={
          <div className="flex gap-1.5">
            {u.admin && <Badge tone="accent">admin</Badge>}
            {u.suspended && <Badge tone="danger">suspended</Badge>}
          </div>
        }
      />
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Level", u.level ?? 1],
            ["XP", u.xp ?? 0],
            ["Streak", u.streak ?? 0],
            ["Assessment", u.depth ?? "not done"],
          ].map(([k, v]) => (
            <Card key={k as string} className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{k}</p>
              <p className="mt-1 text-xl font-extrabold tabular-nums">{v}</p>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader title="Activity · last 14 days" description="Check-ins + sessions completed per day." />
          <div className="flex h-24 items-end gap-1.5 px-5 pb-4 pt-2">
            {d.days.map((x) => (
              <div key={x.d} className="flex flex-1 flex-col items-center gap-1" title={`${x.d}: ${x.n}`}>
                <div className="w-full rounded-t bg-accent" style={{ height: `${Math.max(3, (x.n / max) * 64)}px`, opacity: x.n ? 1 : 0.25 }} />
                <span className="text-[10px] text-muted">{x.d.slice(8)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Usage" description="Counts only - content stays private." />
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 px-5 pb-5 pt-2 text-sm sm:grid-cols-3">
            {Object.entries(LABELS).map(([k, label]) => (
              <div key={k} className="flex justify-between border-b border-line py-1.5">
                <dt className="text-muted">{label}</dt>
                <dd className="font-semibold tabular-nums">{d.counts[k] ?? 0}</dd>
              </div>
            ))}
          </dl>
        </Card>
        {u.id !== me.id && <UserActions user={{ id: u.id, name: u.name, admin: u.admin, suspended: u.suspended }} />}
      </div>
    </>
  );
}
