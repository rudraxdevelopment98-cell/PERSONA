"use client";

import { useEffect, useRef, useState } from "react";
import { DIMENSION_META, DIMENSIONS, type Dimension } from "@/lib/domain/dimensions";
import { Delta, cx } from "./ui";
import { useT } from "@/lib/i18n/client";

type Row = { dimension: Dimension; current: number; baseline?: number };

const ARC = 0.5; // half ring: the left semicircle, open toward the list on the right

/**
 * Interactive skills dial: an open "C" gauge on the side + a wheel-style list.
 * The item nearest the gauge's centre is the active one — the gauge fills to its
 * value, its dot lights up, and the list items fade and shrink away from the centre
 * like a scroll wheel. Reduced-motion safe.
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

  const size = 140;
  const stroke = 13;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const a = sorted[active];
  const cur = a?.current ?? 0;
  const ease = "cubic-bezier(0.2, 0.7, 0.2, 1)";
  // Dots sit along the left semicircle: bottom → left → top (screen angles).
  const dotAngle = (i: number) => 90 + (i / (n - 1)) * 180;

  return (
    <div className="grid grid-cols-[108px_1fr] gap-2 sm:grid-cols-[132px_1fr] sm:gap-5">
      {/* Left half-ring gauge, open towards the list */}
      <div className="sticky top-24 z-10 -ml-1 self-start">
        <div ref={ringRef} className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} style={{ transform: "rotate(90deg)" }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-primary-soft)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${ARC * c} ${c}`} />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${(cur / 100) * ARC * c} ${c}`}
              style={{ transition: `stroke-dasharray 0.6s ${ease}` }}
            />
          </svg>
          {/* Skill dots along the arc; the active one lights up */}
          {sorted.map((row, i) => {
            const rad = (dotAngle(i) * Math.PI) / 180;
            const x = size / 2 + r * Math.cos(rad);
            const y = size / 2 + r * Math.sin(rad);
            return (
              <span
                key={row.dimension}
                className={cx("absolute block rounded-full border-2 border-surface transition-all duration-300", i === active ? "size-3.5 bg-accent" : "size-2 bg-line")}
                style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}
              />
            );
          })}
          {/* Centre: score, delta, name */}
          <div className="absolute inset-y-0 left-0 flex w-[70%] flex-col items-center justify-center text-center">
            <span key={active} className="animate-pop text-[2rem] font-extrabold leading-none tabular-nums">{Math.round(cur)}</span>
            {a?.baseline != null && <span className="mt-0.5"><Delta value={cur - a.baseline} /></span>}
            <span className="mt-1 text-[11px] font-bold uppercase leading-tight tracking-wide text-muted">{t(DIMENSION_META[a.dimension].label)}</span>
          </div>
        </div>
      </div>

      {/* Wheel-style list: the centred skill is large and active, neighbours fade away */}
      <div className="py-6">
        {sorted.map((row, i) => {
          const dist = Math.abs(i - active);
          const opacity = i === active ? 1 : dist === 1 ? 0.7 : dist === 2 ? 0.45 : 0.3;
          const scale = i === active ? 1 : dist === 1 ? 0.97 : 0.94;
          return (
            <div
              key={row.dimension}
              ref={(el) => {
                items.current[i] = el;
              }}
              className={cx("scroll-mt-24 rounded-2xl px-3 py-3 transition-all duration-300 motion-reduce:!opacity-100 motion-reduce:!scale-100", i === active && "bg-accent-soft")}
              style={{ opacity, transform: `scale(${scale})` }}
            >
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className={cx("font-semibold transition-colors", i === active ? "text-base text-accent" : "text-sm text-ink")}>{t(DIMENSION_META[row.dimension].label)}</span>
                <span className="flex items-baseline gap-2">
                  {row.baseline != null && <Delta value={row.current - row.baseline} />}
                  <span className="w-9 text-right text-sm font-extrabold tabular-nums">{Math.round(row.current)}</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-primary-soft">
                <div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${row.current}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
