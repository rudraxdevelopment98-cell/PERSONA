"use client";

import { useEffect, useRef, useState } from "react";
import { DIMENSION_META, DIMENSIONS, type Dimension } from "@/lib/domain/dimensions";
import { Delta, cx } from "./ui";
import { useT } from "@/lib/i18n/client";

type Row = { dimension: Dimension; current: number; baseline?: number };

const H = 240; // picker height
const ITEM = 48; // row height / scroll step
const PAD = (H - ITEM) / 2;
const ANGLE = 18; // degrees between items on the cylinder
const RADIUS = 168; // cylinder radius (px)

/**
 * Skills wheel: a value ring on the left + an iOS-style 3-D picker on the right.
 * Flick the wheel to turn it — the skill in the centre band is active (crisp, in
 * the ring); the others tilt back and fade on the cylinder. Snaps to each skill.
 */
export function SkillsDial({ rows }: { rows: Row[] }) {
  const t = useT();
  const sorted = [...rows].sort((a, b) => DIMENSIONS.indexOf(a.dimension) - DIMENSIONS.indexOf(b.dimension));
  const n = sorted.length;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [af, setAf] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let ticking = false;
    const run = () => {
      setAf(el.scrollTop / ITEM);
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(run);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const active = Math.max(0, Math.min(n - 1, Math.round(af)));
  const a = sorted[active];
  const size = 120;
  const stroke = 11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div className="grid grid-cols-[120px_1fr] items-center gap-3 sm:gap-5">
      {/* Value ring */}
      <div className="relative justify-self-center" style={{ width: size, height: size }}>
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
            strokeDashoffset={c * (1 - a.current / 100)}
            style={{ transition: "stroke-dashoffset 0.35s cubic-bezier(0.2,0.7,0.2,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[2rem] font-extrabold leading-none tabular-nums">{Math.round(a.current)}</span>
          {a.baseline != null && <span className="mt-0.5"><Delta value={a.current - a.baseline} /></span>}
        </div>
      </div>

      {/* 3-D flick wheel of skill names */}
      <div className="relative overflow-hidden" style={{ height: H, perspective: 1000 }}>
        {/* fade top & bottom */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-16 bg-gradient-to-b from-surface to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t from-surface to-transparent" />
        {/* centre selection band */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-0 h-12 -translate-y-1/2 rounded-xl border-y border-line/70 bg-accent-soft/40" />

        {/* the rotating names */}
        <div className="pointer-events-none absolute inset-0 z-10" style={{ transformStyle: "preserve-3d" }}>
          {sorted.map((row, i) => {
            const ang = (i - af) * ANGLE;
            if (Math.abs(ang) > 84) return null;
            const isA = i === active && Math.abs(ang) < ANGLE / 2;
            const op = Math.max(0, Math.cos((ang * Math.PI) / 180));
            return (
              <div
                key={row.dimension}
                className="absolute inset-x-0 top-1/2 flex h-12 -translate-y-1/2 items-center px-3"
                style={{ transform: `rotateX(${ang}deg) translateZ(${RADIUS}px)`, opacity: isA ? 1 : op * 0.8, backfaceVisibility: "hidden" }}
              >
                <span className={cx("whitespace-nowrap font-bold leading-tight", isA ? "text-lg text-ink" : "text-base font-semibold text-muted")}>
                  {t(DIMENSION_META[row.dimension].label)}
                </span>
              </div>
            );
          })}
        </div>

        {/* transparent scroll surface that drives the wheel (flick to turn) */}
        <div ref={scrollRef} className="no-scrollbar absolute inset-0 z-30 snap-y snap-mandatory overflow-y-scroll overscroll-contain" aria-label={t("Your 10 skills")}>
          <div style={{ paddingTop: PAD, paddingBottom: PAD }}>
            {sorted.map((row) => (
              <div key={row.dimension} className="snap-center" style={{ height: ITEM }} aria-label={t(DIMENSION_META[row.dimension].label)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
