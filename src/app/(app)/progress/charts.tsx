"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Select } from "@/components/ui";
import { DIMENSION_META, DIMENSIONS, type Dimension } from "@/lib/domain/dimensions";

type Point = { date: string; overall: number; scores: Partial<Record<Dimension, number>> };

const fmtDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

function TrendChart({ data, dataKey, baseline, label }: { data: { date: string; value: number | null }[]; dataKey: string; baseline?: number; label: string }) {
  if (data.length < 2) {
    return <p className="px-5 py-10 text-center text-sm text-muted">The trend appears once your scores have changed on at least two different days.</p>;
  }
  return (
    <div className="h-64 w-full px-2 pb-3 pt-5" role="img" aria-label={`${label} over time`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="#EEF0F2" vertical={false} />
          <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: "#737B85" }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} minTickGap={24} />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 11, fill: "#737B85" }} tickLine={false} axisLine={false} />
          {baseline != null && (
            <ReferenceLine y={baseline} stroke="#A3AAB3" strokeDasharray="4 4" label={{ value: "Baseline", position: "insideTopLeft", fontSize: 11, fill: "#737B85" }} />
          )}
          <Tooltip
            cursor={{ stroke: "#D4D8DE" }}
            contentStyle={{ borderRadius: 6, border: "1px solid #E5E7EB", fontSize: 12, boxShadow: "0 2px 8px rgba(16,24,40,.06)" }}
            labelFormatter={(d) => fmtDate(String(d))}
            formatter={(v) => [v, label]}
          />
          <Line type="monotone" dataKey={dataKey} name={label} stroke="#26364A" strokeWidth={2} dot={{ r: 4, fill: "#26364A", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 5 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OverallTrend({ history, baseline }: { history: Point[]; baseline: number }) {
  return <TrendChart data={history.map((p) => ({ date: p.date, value: p.overall }))} dataKey="value" baseline={baseline} label="Overall score" />;
}

export function SkillTrend({ history, baselines }: { history: Point[]; baselines: Partial<Record<Dimension, number>> }) {
  const [dim, setDim] = useState<Dimension>("confidence");
  const data = history.filter((p) => p.scores[dim] != null).map((p) => ({ date: p.date, value: p.scores[dim]! }));
  // Collapse consecutive identical values recorded by other dimensions' updates.
  const deduped = data.filter((p, i) => i === 0 || i === data.length - 1 || p.value !== data[i - 1].value);
  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <p className="text-sm font-semibold">Skill trend</p>
        <Select value={dim} onChange={(e) => setDim(e.target.value as Dimension)} className="w-56" aria-label="Choose a skill">
          {DIMENSIONS.map((d) => (
            <option key={d} value={d}>{DIMENSION_META[d].label}</option>
          ))}
        </Select>
      </div>
      <TrendChart data={deduped} dataKey="value" baseline={baselines[dim]} label={DIMENSION_META[dim].label} />
    </div>
  );
}
