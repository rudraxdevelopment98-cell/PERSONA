import { Card, CardHeader, PageHeader } from "@/components/ui";
import { errorSummary } from "@/lib/server/errors";

export const metadata = { title: "Errors · Admin" };
export const dynamic = "force-dynamic";

const SOURCE: Record<string, string> = { server: "Server", client: "Browser", ai: "AI" };

export default async function AdminErrors({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const sp = await searchParams;
  const hours = sp.range === "7d" ? 168 : 24;
  const { rows, hourly } = await errorSummary(hours);
  const max = Math.max(1, ...hourly.map((h) => h.n));
  const total = rows.reduce((a, r) => a + r.count, 0);
  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Errors"
        description="Grouped problems from the server, AI calls and people's browsers. No personal content is stored: only the page or route, a short message and counts. Admins get a notification when there are 20+ errors in an hour."
      />
      <div className="space-y-4">
        <Card>
          <CardHeader title="Last 24 hours" description={`${hourly.reduce((a, h) => a + h.n, 0)} errors`} />
          <div className="flex h-24 items-end gap-1 px-5 pb-5" role="img" aria-label="Errors per hour, last 24 hours">
            {hourly.map((h) => (
              <div key={h.h} className="flex flex-1 flex-col items-center gap-1" title={`${h.h}:00 · ${h.n}`}>
                <div className={`w-full rounded-t ${h.n >= 20 ? "bg-danger" : "bg-primary"}`} style={{ height: `${(h.n / max) * 100}%`, minHeight: h.n ? 3 : 0 }} />
                <span className="text-[9px] text-muted">{h.h}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader
            title={hours === 24 ? "Top problems · 24 hours" : "Top problems · 7 days"}
            description={`${total} errors in ${rows.length} groups`}
            action={
              <div className="flex rounded-xl border border-line p-0.5 text-xs font-semibold">
                <a href="/admin/errors" className={`rounded-lg px-2.5 py-1 ${hours === 24 ? "bg-primary-soft text-primary" : "text-muted"}`}>24h</a>
                <a href="/admin/errors?range=7d" className={`rounded-lg px-2.5 py-1 ${hours !== 24 ? "bg-primary-soft text-primary" : "text-muted"}`}>7 days</a>
              </div>
            }
          />
          {rows.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted">No errors. 🎉</p>
          ) : (
            <div className="divide-y divide-line">
              {rows.map((r) => (
                <div key={r.fingerprint} className="flex items-start gap-3 px-5 py-3">
                  <span className="w-12 shrink-0 text-right text-lg font-extrabold tabular-nums">{r.count}</span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold">{r.message}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {SOURCE[r.source] ?? r.source} · <code>{r.location}</code> · last {new Date(r.last_seen).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
