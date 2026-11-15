import Link from "next/link";
import { notFound } from "next/navigation";
import { Flag, ShieldCheck, Users } from "lucide-react";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/db/server";
import { hasAnyAdmin, isAdmin, listReports, stats } from "@/lib/server/admin";
import { AddAdmin, ClaimAdmin, ReportCard } from "./admin-ui";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{value.toLocaleString()}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { user } = await requireUser();
  const [admin, sp] = await Promise.all([isAdmin(user.id), searchParams]);

  if (!admin) {
    // Hidden unless the first admin still needs to be set up.
    if (await hasAnyAdmin()) notFound();
    return (
      <>
        <PageHeader title="Admin setup" description="Enter the one-time setup code to become this app's first admin." />
        <ClaimAdmin />
      </>
    );
  }

  const tab = sp.tab === "closed" ? "closed" : "open";
  const [s, reports] = await Promise.all([stats(), listReports(tab)]);
  const max = Math.max(1, ...s.daily.map((d) => d.n));

  return (
    <>
      <PageHeader eyebrow="Admin" title="Overview" description="Numbers are counts only. Users' journals, answers and chats are never shown here." />
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Users" value={s.users} hint={`+${s.new_7d} this week`} />
          <Stat label="Active today" value={s.active_1d} hint={`${s.active_7d} this week`} />
          <Stat label="Sessions done" value={s.sessions} hint={`${s.sessions_7d} this week`} />
          <Stat label="Assessments" value={s.assessments} />
          <Stat label="Friendships" value={s.friendships} />
          <Stat label="Circles" value={s.circles} />
          <Stat label="Open reports" value={s.open_reports} />
          <Stat label="Suspended" value={s.suspended} />
        </div>

        <Card>
          <CardHeader title="Sessions completed · last 14 days" />
          <div className="flex h-36 items-end gap-1.5 px-5 pb-4 pt-2" role="img" aria-label="Sessions completed per day">
            {s.daily.map((d) => (
              <div key={d.d} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] tabular-nums text-muted">{d.n || ""}</span>
                <div className="w-full rounded-t-md bg-primary/80" style={{ height: `${Math.max(2, (d.n / max) * 96)}px` }} title={`${d.d}: ${d.n}`} />
                <span className="text-[10px] text-muted">{d.d.slice(8)}</span>
              </div>
            ))}
          </div>
        </Card>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted">
              <Flag className="size-4" /> Reports
            </h2>
            <div className="flex rounded-xl border border-line p-0.5 text-xs font-semibold">
              <Link href="/admin" className={`rounded-lg px-3 py-1 ${tab === "open" ? "bg-primary-soft text-primary" : "text-muted"}`}>Open ({s.open_reports})</Link>
              <Link href="/admin?tab=closed" className={`rounded-lg px-3 py-1 ${tab === "closed" ? "bg-primary-soft text-primary" : "text-muted"}`}>Closed</Link>
            </div>
          </div>
          {reports.length === 0 ? (
            <Card>
              <EmptyState icon={<ShieldCheck className="size-6" />} title={tab === "open" ? "No open reports" : "No closed reports yet"} description="Reports from users about people or circles appear here." />
            </Card>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <ReportCard key={r.id} report={r} />
              ))}
            </div>
          )}
        </section>

        <Card>
          <CardHeader title="Admins" description="Give another account admin access." icon={<Users className="mt-0.5 size-5 text-primary" />} />
          <div className="px-5 pb-5">
            <AddAdmin />
          </div>
        </Card>
      </div>
    </>
  );
}
