import { Card, CardHeader, PageHeader } from "@/components/ui";
import { DISPLAY_PRICES } from "@/lib/domain/plans";
import { SESSION_TOKENS_ESTIMATE, TIER_CHOICES, costUSD } from "@/lib/domain/ai-pricing";
import { aiCosts, aiTiers, stats } from "@/lib/server/admin";
import { revenueStats } from "@/lib/server/payments";
import { Calculator, TierForm } from "./ai-ui";

export const metadata = { title: "AI & costs · Admin" };

const usd = (n: number) => (n >= 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(4)}`);

function Table({ title, rows, cols }: { title: string; rows: Record<string, string | number>[]; cols: { key: string; label: string; money?: boolean; right?: boolean }[] }) {
  return (
    <Card className="overflow-x-auto">
      <CardHeader title={title} />
      <table className="w-full min-w-[360px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            {cols.map((c) => (
              <th key={c.key} className={`px-5 py-2 font-semibold ${c.right ? "text-right" : ""}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={cols.length} className="px-5 py-4 text-muted">No AI calls in the last 30 days.</td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line last:border-0">
              {cols.map((c) => (
                <td key={c.key} className={`px-5 py-2 ${c.right ? "text-right tabular-nums" : ""}`}>
                  {c.money ? usd(Number(r[c.key])) : String(r[c.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export default async function AdminAI() {
  const [tiers, c, rev, s] = await Promise.all([aiTiers(), aiCosts(), revenueStats(), stats()]);
  const paid = rev.paid ?? { month: 0, year: 0 };
  const mrr = paid.month * DISPLAY_PRICES.month + (paid.year * DISPLAY_PRICES.year) / 12;
  const measuredSession = c.perSession.sessions > 0 ? c.perSession.cost / c.perSession.sessions : null;
  const max = Math.max(0.0001, ...c.daily.map((d) => d.cost));
  const choices = TIER_CHOICES.map((t) => ({
    id: t.id,
    label: t.label,
    perSession: t.provider === "default" ? null : costUSD(t.model, SESSION_TOKENS_ESTIMATE.input, SESSION_TOKENS_ESTIMATE.output),
  }));
  return (
    <>
      <PageHeader eyebrow="Admin" title="AI models & costs" description="Choose the AI for each plan and keep AI spending below revenue." />
      <div className="space-y-4">
        {mrr > 0 && c.tot.cost > mrr * 0.3 && (
          <div className="rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            AI costs are {Math.round((c.tot.cost / mrr) * 100)}% of revenue (target: under 30%). Switch the everyday model to a cheaper one or tighten Free limits.
          </div>
        )}
        <TierForm choices={choices} current={tiers} />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">AI cost · 30 days</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">{usd(c.tot.cost)}</p>
            <p className="text-xs text-muted">{c.tot.calls.toLocaleString()} calls · {c.tot.failed} failed</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Per daily session</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">{measuredSession != null ? usd(measuredSession) : "–"}</p>
            <p className="text-xs text-muted">measured from {c.perSession.sessions} sessions</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Revenue / month (est.)</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">${mrr.toFixed(2)}</p>
            <p className="text-xs text-muted">{paid.month + paid.year} paying users</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">AI cost vs revenue</p>
            <p className={`mt-1 text-2xl font-extrabold tabular-nums ${c.tot.cost > mrr ? "text-danger" : "text-success"}`}>
              {mrr > 0 ? `${Math.round((c.tot.cost / mrr) * 100)}%` : c.tot.cost > 0 ? "no revenue yet" : "–"}
            </p>
            <p className="text-xs text-muted">keep under ~30% of revenue</p>
          </Card>
        </div>
        <p className="text-xs text-muted">
          Costs use list prices. While the app runs on a free-tier Gemini key, the real bill for those calls is $0 - this shows what the same usage would cost on paid models.
        </p>

        <Card>
          <CardHeader title="AI cost per day" />
          <div className="flex h-36 items-end gap-1.5 px-5 pb-4 pt-2">
            {c.daily.map((d) => (
              <div key={d.d} className="flex flex-1 flex-col items-center gap-1" title={`${d.d}: ${usd(d.cost)} · ${d.calls} calls`}>
                <div className="w-full rounded-t bg-coral" style={{ height: `${Math.max(2, (d.cost / max) * 100)}px`, opacity: d.calls ? 1 : 0.25 }} />
                <span className="text-[10px] text-muted">{d.d.slice(8)}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Table title="By feature" rows={c.byFeature} cols={[{ key: "k", label: "Feature" }, { key: "calls", label: "Calls", right: true }, { key: "cost", label: "Cost", money: true, right: true }]} />
          <Table title="By plan" rows={c.byTier} cols={[{ key: "k", label: "Plan" }, { key: "users", label: "Users", right: true }, { key: "calls", label: "Calls", right: true }, { key: "cost", label: "Cost", money: true, right: true }]} />
          <Table title="By model" rows={c.byModel} cols={[{ key: "k", label: "Model" }, { key: "calls", label: "Calls", right: true }, { key: "cost", label: "Cost", money: true, right: true }]} />
          <Table title="Most expensive users" rows={c.topUsers} cols={[{ key: "name", label: "User" }, { key: "tier", label: "Plan" }, { key: "calls", label: "Calls", right: true }, { key: "cost", label: "Cost", money: true, right: true }]} />
        </div>

        <Calculator defaults={{ users: Math.max(100, s.users), perSession: measuredSession ?? costUSD("claude-haiku-5.5", SESSION_TOKENS_ESTIMATE.input, SESSION_TOKENS_ESTIMATE.output), price: DISPLAY_PRICES.month }} />
      </div>
    </>
  );
}
