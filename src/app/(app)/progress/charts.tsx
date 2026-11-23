"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Select } from "@/components/ui";
import { DIMENSION_META, DIMENSIONS, type Dimension } from "@/lib/domain/dimensions";
import { useT } from "@/lib/i18n/client";

type Point = { date: string; overall: number; scores: Partial<Record<Dimension, number>> };

const fmtDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

function TrendChart({ data, dataKey, baseline, label }: { data: { date: string; value: number | null }[]; dataKey: string; baseline?: number; label: string }) {
  const t = useT();
  if (data.length < 2) {
    return <p className="px-5 py-10 text-center text-sm text-muted">{t("📈 Your trend shows up after 2 days of practice")}</p>;
  }
  return (
    <div className="h-64 w-full px-2 pb-3 pt-5" role="img" aria-label={t("{0} over time", label)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="var(--color-line)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: "var(--color-muted)" }} tickLine={false} axisLine={{ stroke: "var(--color-line)" }} minTickGap={24} />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 11, fill: "var(--color-muted)" }} tickLine={false} axisLine={false} />
          {baseline != null && (
            <ReferenceLine y={baseline} stroke="var(--color-muted)" strokeDasharray="4 4" label={{ value: "Baseline", position: "insideTopLeft", fontSize: 11, fill: "var(--color-muted)" }} />
          )}
          <Tooltip
            cursor={{ stroke: "var(--color-line-strong)" }}
            contentStyle={{ borderRadius: 12, border: "1px solid var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)", fontSize: 12, boxShadow: "var(--shadow-raised)" }}
            labelFormatter={(d) => fmtDate(String(d))}
            formatter={(v) => [v, label]}
          />
          <Line type="monotone" dataKey={dataKey} name={label} stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-primary)", stroke: "var(--color-surface)", strokeWidth: 2 }} activeDot={{ r: 5 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OverallTrend({ history, baseline }: { history: Point[]; baseline: number }) {
  const t = useT();
  return <TrendChart data={history.map((p) => ({ date: p.date, value: p.overall }))} dataKey="value" baseline={baseline} label={t("Overall score")} />;
}

export function SkillTrend({ history, baselines }: { history: Point[]; baselines: Partial<Record<Dimension, number>> }) {
  const t = useT();
  const [dim, setDim] = useState<Dimension>("confidence");
  const data = history.filter((p) => p.scores[dim] != null).map((p) => ({ date: p.date, value: p.scores[dim]! }));
  // Collapse consecutive identical values recorded by other dimensions' updates.
  const deduped = data.filter((p, i) => i === 0 || i === data.length - 1 || p.value !== data[i - 1].value);
  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <p className="text-sm font-semibold">{t("Skill trend")}</p>
        <Select value={dim} onChange={(e) => setDim(e.target.value as Dimension)} className="w-56" aria-label={t("Choose a skill")}>
          {DIMENSIONS.map((d) => (
            <option key={d} value={d}>{t(DIMENSION_META[d].label)}</option>
          ))}
        </Select>
      </div>
      <TrendChart data={deduped} dataKey="value" baseline={baselines[dim]} label={t(DIMENSION_META[dim].label)} />
    </div>
  );
}
