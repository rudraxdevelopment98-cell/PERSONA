import { DIMENSION_META, DIMENSIONS, type Dimension } from "@/lib/domain/dimensions";
import { Delta } from "./ui";

type Row = { dimension: Dimension; current: number; baseline?: number };

/** Horizontal 0-100 bars; when a baseline is given it is marked with a tick. */
export function ScoreBars({ rows }: { rows: Row[] }) {
  const sorted = [...rows].sort((a, b) => DIMENSIONS.indexOf(a.dimension) - DIMENSIONS.indexOf(b.dimension));
  return (
    <ul className="space-y-3.5">
      {sorted.map((r) => (
        <li key={r.dimension}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="text-ink">{DIMENSION_META[r.dimension].label}</span>
            <span className="flex items-baseline gap-2">
              {r.baseline != null && <Delta value={r.current - r.baseline} />}
              <span className="w-9 text-right font-medium tabular-nums">{Math.round(r.current)}</span>
            </span>
          </div>
          <div className="relative h-1.5 rounded-full bg-primary-soft">
            <div className="h-full rounded-full bg-primary" style={{ width: `${r.current}%` }} />
            {r.baseline != null && (
              <div className="absolute -top-0.5 h-2.5 w-0.5 rounded bg-muted" style={{ left: `calc(${r.baseline}% - 1px)` }} title={`Baseline ${r.baseline}`} />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
