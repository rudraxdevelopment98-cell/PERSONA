"use client";

import { useEffect, useRef, useState } from "react";
import { DIMENSION_META, DIMENSIONS, type Dimension } from "@/lib/domain/dimensions";
import { Delta, cx } from "./ui";
import { useT } from "@/lib/i18n/client";

type Row = { dimension: Dimension; current: number; baseline?: number };

/**
 * An interactive skills dial: a ring on the side shows the active skill's score
 * and fill; scrolling the list rotates the ring so the active skill's dot comes
 * to the top and the ring fills to its value. Reduced-motion safe.
 */
export function SkillsDial({ rows }: { rows: Row[] }) {
  const t = useT();
  const sorted = [...rows].sort((a, b) => DIMENSIONS.indexOf(a.dimension) - DIMENSIONS.indexOf(b.dimension));
  const n = sorted.length;
  const [active, setActive] = useState(0);
  const ringRef = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let ticking = false;
    const measure = () => {
      const ring = ringRef.current;
      if (!ring) return;
      const box = ring.getBoundingClientRect();
      const cy = box.top + box.height / 2;
      let best = 0;
      let bestD = Infinity;
      items.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - cy);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      setActive(best);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        measure();
        ticking = false;
      });
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [n]);

  const size = 176;
  const stroke = 13;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dotR = r; // dots sit on the ring
  const a = sorted[active];
  const cur = a?.current ?? 0;
  const ease = "cubic-bezier(0.2, 0.7, 0.2, 1)";

  return (
    <div className="grid gap-6 sm:grid-cols-[196px_1fr]">
      {/* Ring */}
      <div className="sticky top-20 z-10 self-start justify-self-center py-1">
        <div ref={ringRef} className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-primary-soft)" strokeWidth={stroke} />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - cur / 100)}
              style={{ transition: `stroke-dashoffset 0.6s ${ease}` }}
            />
          </svg>
          {/* Rotating dots: active skill's dot turns to the top */}
          <div className="absolute inset-0 motion-reduce:!rotate-0" style={{ transform: `rotate(${-active * (360 / n)}deg)`, transition: `transform 0.6s ${ease}` }}>
            {sorted.map((row, i) => {
              const ang = ((i * (360 / n) - 90) * Math.PI) / 180;
              const x = size / 2 + dotR * Math.cos(ang);
              const y = size / 2 + dotR * Math.sin(ang);
              return (
                <span
                  key={row.dimension}
                  className={cx("absolute block rounded-full border-2 border-surface transition-all", i === active ? "size-3.5 bg-accent" : "size-2 bg-line")}
                  style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}
                />
              );
            })}
          </div>
          {/* Center: score + name */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-7 text-center">
            <span key={active} className="animate-pop text-4xl font-extrabold tabular-nums">{Math.round(cur)}</span>
            {a?.baseline != null && <Delta value={cur - a.baseline} />}
            <span className="mt-1 text-[11px] font-bold uppercase leading-tight tracking-wide text-muted">{t(DIMENSION_META[a.dimension].label)}</span>
          </div>
        </div>
      </div>

      {/* Scrollable skill list */}
      <div className="space-y-1.5">
        {sorted.map((row, i) => (
          <div
            key={row.dimension}
            ref={(el) => {
              items.current[i] = el;
            }}
            className={cx("scroll-mt-24 rounded-2xl px-3 py-3 transition-colors", i === active ? "bg-accent-soft" : "")}
          >
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className={cx("text-sm font-semibold transition-colors", i === active ? "text-accent" : "text-ink")}>{t(DIMENSION_META[row.dimension].label)}</span>
              <span className="flex items-baseline gap-2">
                {row.baseline != null && <Delta value={row.current - row.baseline} />}
                <span className="w-9 text-right text-sm font-extrabold tabular-nums">{Math.round(row.current)}</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-primary-soft">
              <div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${row.current}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
