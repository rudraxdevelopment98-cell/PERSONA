import { DIMENSION_META, DIMENSIONS, type Dimension } from "@/lib/domain/dimensions";
import { Delta } from "./ui";

type Row = { dimension: Dimension; current: number; baseline?: number };

/** Horizontal 0-100 bars; when a baseline is given it is marked with a tick. */
export function ScoreBars({ rows }: { rows: Row[] }) {
  const sorted = [...rows].sort((a, b) => DIMENSIONS.indexOf(a.dimension) - DIMENSIONS.indexOf(b.dimension));
  return (
    <ul className="space-y-4">
      {sorted.map((r) => (
        <li key={r.dimension}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="font-semibold text-ink">{DIMENSION_META[r.dimension].label}</span>
            <span className="flex items-baseline gap-2">
              {r.baseline != null && <Delta value={r.current - r.baseline} />}
              <span className="w-9 text-right font-extrabold tabular-nums">{Math.round(r.current)}</span>
            </span>
          </div>
          <div className="relative h-2.5 rounded-full bg-primary-soft">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${r.current}%` }} />
            {r.baseline != null && (
              <div className="absolute -top-1 h-4.5 w-1 rounded-full border-2 border-surface bg-ink/70" style={{ left: `calc(${r.baseline}% - 1px)` }} title={`Baseline ${r.baseline}`} />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
