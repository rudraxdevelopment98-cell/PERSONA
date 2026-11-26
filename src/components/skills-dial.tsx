"use client";

import { useEffect, useRef, useState } from "react";
import { DIMENSION_META, DIMENSIONS, type Dimension } from "@/lib/domain/dimensions";
import { Delta, cx } from "./ui";
import { useT } from "@/lib/i18n/client";

type Row = { dimension: Dimension; current: number; baseline?: number };

/**
 * A rotary skills dial. A big wheel sits anchored off the left edge — only its
 * right rim shows. Scrolling through the section spins the wheel: the skill at
 * the centre-right is active (big, dark, with its score), the others curve up
 * and down the rim, greyed and fading. Reduced-motion safe (it is scroll-driven).
 */
export function SkillsDial({ rows }: { rows: Row[] }) {
  const t = useT();
  const sorted = [...rows].sort((a, b) => DIMENSIONS.indexOf(a.dimension) - DIMENSIONS.indexOf(b.dimension));
  const n = sorted.length;

  const DIAL_H = 290; // visible dial height
  const STEP_PX = 66; // scroll distance per skill
  const R = 360; // wheel radius
  const STEP_DEG = 17; // angle between skills on the rim
  const MAX_DEG = 52; // past this the label is hidden
  const cxp = -R * 0.76; // wheel centre, pushed well off the left edge so labels have room
  const cyp = DIAL_H / 2;

  const outerRef = useRef<HTMLDivElement>(null);
  const [af, setAf] = useState(0); // active position, fractional

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    let ticking = false;
    const run = () => {
      const top = el.getBoundingClientRect().top;
      const total = el.offsetHeight - DIAL_H;
      const p = Math.max(0, Math.min(1, -top / Math.max(1, total)));
      setAf(p * (n - 1));
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(run);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    run();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [n]);

  const active = Math.max(0, Math.min(n - 1, Math.round(af)));
  const a = sorted[active];

  return (
    // Tall section: scrolling through it turns the dial.
    <div ref={outerRef} className="relative" style={{ height: DIAL_H + (n - 1) * STEP_PX }}>
      <div className="sticky top-16 overflow-hidden" style={{ height: DIAL_H }}>
        {/* Wheel rim (the right edge of a big circle; the left half is clipped away) */}
        <svg className="pointer-events-none absolute inset-0" width="100%" height={DIAL_H} aria-hidden>
          <circle cx={cxp} cy={cyp} r={R} fill="none" stroke="var(--color-line)" strokeWidth={2} />
          <circle cx={cxp} cy={cyp} r={R - 10} fill="none" stroke="var(--color-primary-soft)" strokeWidth={2} strokeDasharray="2 8" />
        </svg>

        {/* Skill labels riding the rim */}
        {sorted.map((row, i) => {
          const deg = (i - af) * STEP_DEG;
          if (Math.abs(deg) > MAX_DEG) return null;
          const rad = (deg * Math.PI) / 180;
          const x = cxp + R * Math.cos(rad);
          const y = cyp + R * Math.sin(rad);
          const far = Math.abs(deg) / MAX_DEG; // 0 centre … 1 edge
          const isA = i === active && Math.abs(deg) < STEP_DEG / 2;
          return (
            <div
              key={row.dimension}
              className="absolute flex items-center gap-2 will-change-transform"
              style={{ left: x, top: y, transform: `translateY(-50%) scale(${isA ? 1 : 1 - far * 0.25})`, opacity: isA ? 1 : Math.max(0.18, 0.85 - far * 0.8) }}
            >
              <span className={cx("h-2.5 w-2.5 shrink-0 rounded-full border-2 border-surface", isA ? "bg-accent" : "bg-line")} />
              <span className={cx("whitespace-nowrap font-semibold leading-tight", isA ? "text-base text-ink" : "text-sm text-muted")}>
                {t(DIMENSION_META[row.dimension].label)}
              </span>
            </div>
          );
        })}

        {/* Active skill's score, pinned at the dial's centre-right */}
        <div className="absolute flex items-center gap-2" style={{ left: cxp + R + 14, top: cyp + 30, transform: "translateY(-50%)" }}>
          <span key={active} className="animate-pop text-4xl font-extrabold tabular-nums text-accent">{Math.round(a.current)}</span>
          {a.baseline != null && <Delta value={a.current - a.baseline} />}
        </div>
      </div>
    </div>
  );
}
