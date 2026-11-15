import { Card, CardHeader, PageHeader } from "@/components/ui";
import { WORLDS, byId } from "@/lib/domain/variety";
import { insights, stats } from "@/lib/server/admin";

export const metadata = { title: "Admin" };

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{typeof value === "number" ? value.toLocaleString() : value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </Card>
  );
}

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "–");
const LANG: Record<string, string> = { en: "English", hinglish: "Hinglish", hi: "हिन्दी" };

function Breakdown({ title, rows, label }: { title: string; rows: { k: string; n: number }[]; label?: (k: string) => string }) {
  const total = rows.reduce((a, r) => a + r.n, 0) || 1;
  return (
    <Card>
      <CardHeader title={title} />
      <div className="space-y-2 px-5 pb-5 pt-2">
        {rows.length === 0 && <p className="text-sm text-muted">No data yet.</p>}
        {rows.map((r) => (
          <div key={r.k} className="text-sm">
            <div className="flex justify-between">
              <span>{label ? label(r.k) : r.k}</span>
              <span className="tabular-nums text-muted">{r.n} · {pct(r.n, total)}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-bg">
              <div className="h-full rounded-full bg-primary" style={{ width: pct(r.n, total) }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default async function AdminOverview() {
  const [s, ins] = await Promise.all([stats(), insights()]);
  const f = ins.funnel;
  const steps = [
    { label: "Signed up", n: f.signed_up },
    { label: "Finished assessment", n: f.assessed },
    { label: "First check-in", n: f.checked_in },
    { label: "First session", n: f.first_session },
    { label: "3+ sessions", n: f.three_sessions },
    { label: "7+ sessions (week 1)", n: f.week_one },
    { label: "30+ sessions", n: f.month_one },
  ];
  const max = Math.max(1, ...ins.daily.map((d) => Math.max(d.sessions, d.active, d.signups)));

  return (
    <>
      <PageHeader eyebrow="Admin" title="Overview" description="Counts only. Users' journals, answers and chats are never shown here." />
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Users" value={s.users} hint={`+${s.new_7d} this week`} />
          <Stat label="Active today" value={s.active_1d} hint={`${s.active_7d} this week`} />
          <Stat label="Day-1 return" value={pct(ins.ret.d1, ins.ret.d1_base)} hint={`${ins.ret.d1} of ${ins.ret.d1_base} came back next day`} />
          <Stat label="Week-2 return" value={pct(ins.ret.d7, ins.ret.d7_base)} hint={`${ins.ret.d7} of ${ins.ret.d7_base} active on days 7-13`} />
          <Stat label="Sessions done" value={s.sessions} hint={`${s.sessions_7d} this week`} />
          <Stat label="Friendships" value={s.friendships} hint={`${s.circles} circles`} />
          <Stat label="Open reports" value={s.open_reports} />
          <Stat label="Suspended" value={s.suspended} />
        </div>

        <Card>
          <CardHeader title="Where people drop off" description="How many users reached each step. The biggest drop is where to improve next." />
          <div className="space-y-2 px-5 pb-5 pt-2">
            {steps.map((st, i) => {
              const prev = i > 0 ? steps[i - 1].n : st.n;
              const drop = i > 0 && prev > 0 ? Math.max(0, Math.round(((prev - st.n) / prev) * 100)) : 0;
              return (
                <div key={st.label} className="grid grid-cols-[150px_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[200px_1fr_auto]">
                  <span className="truncate">{st.label}</span>
                  <div className="h-6 overflow-hidden rounded-lg bg-bg">
                    <div className="flex h-full items-center rounded-lg bg-primary px-2 text-xs font-bold text-white" style={{ width: pct(st.n, f.signed_up || 1), minWidth: st.n ? "2rem" : 0 }}>
                      {st.n}
                    </div>
                  </div>
                  <span className={`w-14 text-right text-xs font-semibold tabular-nums ${drop >= 40 ? "text-danger" : "text-muted"}`}>{i > 0 ? `−${drop}%` : ""}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader title="Last 14 days" description="Signups, active users and sessions completed per day." />
          <div className="overflow-x-auto px-5 pb-4">
            <div className="flex h-44 min-w-[560px] items-end gap-2 pt-4" role="img" aria-label="Daily signups, active users and sessions">
              {ins.daily.map((d) => (
                <div key={d.d} className="flex flex-1 flex-col items-center gap-1" title={`${d.d}: ${d.signups} signups, ${d.active} active, ${d.sessions} sessions`}>
                  <div className="flex h-32 w-full items-end justify-center gap-0.5">
                    <div className="w-1/3 rounded-t bg-sky" style={{ height: `${(d.signups / max) * 100}%` }} />
                    <div className="w-1/3 rounded-t bg-accent" style={{ height: `${(d.active / max) * 100}%` }} />
                    <div className="w-1/3 rounded-t bg-primary" style={{ height: `${(d.sessions / max) * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-muted">{d.d.slice(8)}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-sky" /> Signups</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-accent" /> Active</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-primary" /> Sessions</span>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Breakdown title="Language" rows={ins.languages} label={(k) => LANG[k] ?? k} />
          <Breakdown title="Assessment length" rows={ins.depths} />
          <Breakdown title="Most played story worlds" rows={ins.worlds} label={(k) => byId(WORLDS, k)?.label ?? k} />
        </div>
      </div>
    </>
  );
}
