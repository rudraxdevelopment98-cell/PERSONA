"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Compass, Flag, GitBranch, Heart, Megaphone, MessageCircle, Scale, Search, Sparkles, Target, type LucideIcon } from "lucide-react";
import { DIMENSION_META, DIMENSIONS, type Dimension } from "@/lib/domain/dimensions";
import { DEFAULT_DIAL, DIAL_STORAGE_KEY, dialTheme, isDarkSurface, type DialTheme, type Surface } from "@/lib/domain/dial-themes";
import { haptic } from "./motion";
import { Delta, cx } from "./ui";
import { useT } from "@/lib/i18n/client";

type Row = { dimension: Dimension; current: number; baseline?: number };

const ICON: Record<Dimension, LucideIcon> = {
  confidence: Sparkles,
  communication: MessageCircle,
  decision_making: GitBranch,
  emotional_intelligence: Heart,
  social_intelligence: Megaphone,
  assertiveness: Scale,
  independent_thinking: Compass,
  critical_thinking: Search,
  leadership: Flag,
  self_discipline: Target,
};

function surfaceClass(s: Surface): string {
  return (
    {
      plain: "bg-surface border border-line",
      glossy: "knob-glossy",
      glass: "knob-glass",
      neumorph: "knob-neumorph",
      neon: "knob-neon",
      metal: "",
      soft: "knob-soft",
    } as Record<Surface, string>
  )[s];
}

/** A circular surface (handles the two-layer metal bezel). */
function Disc({ surface, size, children, className, style }: { surface: Surface; size: number; children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  if (surface === "metal") {
    return (
      <div className={cx("knob-metal rounded-full p-[7px]", className)} style={{ width: size, height: size, ...style }}>
        <div className="knob-metal-inner relative flex size-full items-center justify-center rounded-full">{children}</div>
      </div>
    );
  }
  return (
    <div className={cx("relative flex items-center justify-center rounded-full", surfaceClass(surface), className)} style={{ width: size, height: size, ...style }}>
      {children}
    </div>
  );
}

const round = (n: number) => Math.round(n * 1000) / 1000; // stable string across SSR/CSR
const polar = (cx0: number, cy0: number, r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [round(cx0 + r * Math.cos(a)), round(cy0 + r * Math.sin(a))] as const;
};

/** Left dial: an arc that fills to the score, with the number + improvement in the centre. */
function ValueGauge({ theme, value, delta, size }: { theme: DialTheme; value: number; delta: number | null; size: number }) {
  const dark = isDarkSurface(theme.valueSurface);
  const stroke = Math.round(size * 0.075);
  const inset = Math.round(size * 0.12);
  const r = size / 2 - inset;
  const c = round(2 * Math.PI * r);
  const arcLen = round(theme.arc * c);
  const fillLen = round((Math.max(0, Math.min(100, value)) / 100) * arcLen);
  const rot = theme.arc < 1 ? 135 : -90; // 270° gauges open at the bottom; full rings start at the top
  const gid = `g-${theme.id}`;
  const cx0 = size / 2;
  const cy0 = size / 2;

  const tickCount = theme.ticks === "segments" ? 11 : theme.ticks === "major" ? 21 : 0;
  const ticks = tickCount ? Array.from({ length: tickCount }, (_, i) => i) : [];

  return (
    <Disc surface={theme.valueSurface} size={size}>
      <svg width={size} height={size} className="absolute inset-0" aria-hidden>
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={theme.from} />
            <stop offset="100%" stopColor={theme.to} />
          </linearGradient>
          {theme.glow && (
            <filter id={`${gid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>
        <g transform={`rotate(${rot} ${cx0} ${cy0})`}>
          <circle
            cx={cx0}
            cy={cy0}
            r={r}
            fill="none"
            stroke={theme.track}
            strokeLinecap="round"
            strokeDasharray={theme.ticks === "dots" ? `1.5 9` : `${arcLen} ${c}`}
            strokeWidth={theme.ticks === "dots" ? stroke - 3 : stroke}
          />
          <circle
            cx={cx0}
            cy={cy0}
            r={r}
            fill="none"
            stroke={`url(#${gid})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${fillLen} ${c}`}
            filter={theme.glow ? `url(#${gid}-glow)` : undefined}
            style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.2,0.7,0.2,1)" }}
          />
        </g>
        {ticks.map((i) => {
          const frac = i / (ticks.length - 1);
          const deg = (theme.arc < 1 ? -135 : 0) + frac * theme.arc * 360;
          const [x1, y1] = polar(cx0, cy0, r + stroke / 2 + 3, deg);
          const [x2, y2] = polar(cx0, cy0, r + stroke / 2 + (theme.ticks === "segments" ? 9 : 7), deg);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={dark ? "rgba(255,255,255,.35)" : "var(--color-line-strong)"} strokeWidth={theme.ticks === "segments" ? 3 : 1.5} strokeLinecap="round" />;
        })}
      </svg>
      <div className="relative z-10 flex flex-col items-center justify-center">
        <span key={value} className={cx("dial-pop font-extrabold leading-none tabular-nums", dark ? "text-white" : "text-ink")} style={{ fontSize: size * 0.26 }}>
          {Math.round(value)}
        </span>
        {delta != null && (
          <span className="mt-0.5">
            <Delta value={delta} />
          </span>
        )}
      </div>
    </Disc>
  );
}

/**
 * Right dial: a rotary skill selector. The tick ring rotates so the active skill sits under
 * the fixed pointer; drag the knob or tap the arrows to turn through the skills. The icon in
 * the centre stays upright and swaps to the active skill.
 */
function SkillKnob({ theme, dimension, size, index, total, onStep, interactive }: { theme: DialTheme; dimension: Dimension; size: number; index: number; total: number; onStep: (d: number) => void; interactive: boolean }) {
  const Icon = ICON[dimension];
  const dark = isDarkSurface(theme.knobSurface);
  const step = 360 / total;
  const ringRot = -index * step;
  const cx0 = size / 2;
  const cy0 = size / 2;
  const rOuter = size / 2 - 5;
  const rInner = rOuter - Math.max(9, size * 0.09);
  const accent = theme.to;
  const tickCol = dark ? "rgba(255,255,255,.3)" : "var(--color-line-strong)";

  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ a: number; acc: number } | null>(null);
  const angleAt = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return 0;
    const b = el.getBoundingClientRect();
    return (Math.atan2(clientY - (b.top + b.height / 2), clientX - (b.left + b.width / 2)) * 180) / Math.PI;
  };
  const onDown = (e: React.PointerEvent) => {
    if (!interactive) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { a: angleAt(e.clientX, e.clientY), acc: 0 };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const a = angleAt(e.clientX, e.clientY);
    let d = a - drag.current.a;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    drag.current.a = a;
    drag.current.acc += d;
    while (drag.current.acc >= step) {
      onStep(1);
      drag.current.acc -= step;
    }
    while (drag.current.acc <= -step) {
      onStep(-1);
      drag.current.acc += step;
    }
  };
  const onUp = () => {
    drag.current = null;
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* fixed pointer */}
      <div className="absolute left-1/2 top-[-3px] z-20 -translate-x-1/2" aria-hidden>
        <div style={{ width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: `9px solid ${accent}` }} />
      </div>
      {/* rotating tick ring */}
      <svg width={size} height={size} className="absolute inset-0 z-10" aria-hidden>
        <g style={{ transform: `rotate(${ringRot}deg)`, transformOrigin: "center", transition: "transform 0.45s cubic-bezier(0.2,0.8,0.2,1)" }}>
          {Array.from({ length: total }, (_, i) => i).map((i) => {
            const [x1, y1] = polar(cx0, cy0, rInner, i * step);
            const [x2, y2] = polar(cx0, cy0, rOuter, i * step);
            const on = i === index;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={on ? accent : tickCol} strokeWidth={on ? 3.5 : 1.75} strokeLinecap="round" filter={on && theme.glow ? `url(#kglow-${theme.id})` : undefined} />;
          })}
          {theme.glow && (
            <defs>
              <filter id={`kglow-${theme.id}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.5" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
          )}
        </g>
      </svg>
      {/* draggable knob face + icon */}
      <div
        ref={ref}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className={cx("absolute inset-0 z-10 flex items-center justify-center", interactive && "cursor-grab touch-none active:cursor-grabbing")}
        role={interactive ? "slider" : undefined}
        aria-label={interactive ? "Skill selector" : undefined}
        aria-valuemin={interactive ? 1 : undefined}
        aria-valuemax={interactive ? total : undefined}
        aria-valuenow={interactive ? index + 1 : undefined}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={
          interactive
            ? (e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                  e.preventDefault();
                  onStep(1);
                } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                  e.preventDefault();
                  onStep(-1);
                }
              }
            : undefined
        }
      >
        <Disc surface={theme.knobSurface} size={size - Math.max(22, size * 0.22)} className={theme.knobSurface === "neon" ? "knob-ring-spin" : undefined}>
          <span key={dimension} className="dial-pop">
            <Icon className={dark ? "text-white" : "text-accent"} size={Math.round(size * 0.24)} strokeWidth={2} />
          </span>
        </Disc>
      </div>
    </div>
  );
}

/**
 * Themed dual skill dials — a score gauge (left) and a rotary skill selector (right), in the
 * chosen theme. Drag the knob or tap the arrows to turn through the 10 skills; the score updates
 * with it. `theme` forces a theme (for the Settings preview); otherwise it follows the saved choice.
 */
export function SkillsDial({ rows, theme: forced, preview }: { rows: Row[]; theme?: string; preview?: boolean }) {
  const t = useT();
  const sorted = [...rows].sort((a, b) => DIMENSIONS.indexOf(a.dimension) - DIMENSIONS.indexOf(b.dimension));
  const n = sorted.length;

  const [themeId, setThemeId] = useState(forced ?? DEFAULT_DIAL);
  useEffect(() => {
    if (forced) return;
    const read = () => {
      try {
        setThemeId(localStorage.getItem(DIAL_STORAGE_KEY) || DEFAULT_DIAL);
      } catch {
        /* ignore */
      }
    };
    read();
    window.addEventListener("p90-dial-theme", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("p90-dial-theme", read);
      window.removeEventListener("storage", read);
    };
  }, [forced]);
  const theme = dialTheme(themeId);

  const [active, setActive] = useState(0);
  const step = useCallback(
    (d: number) => {
      setActive((a) => ((a + d) % n + n) % n);
      haptic();
    },
    [n],
  );

  const a = sorted[Math.max(0, Math.min(n - 1, active))];
  const gaugeSize = preview ? 86 : 150;
  const knobSize = preview ? 78 : 132;

  const dials = (
    <div className="flex items-center justify-center gap-3 sm:gap-6">
      <ValueGauge theme={theme} value={a.current} delta={a.baseline != null ? a.current - a.baseline : null} size={gaugeSize} />
      <SkillKnob theme={theme} dimension={a.dimension} size={knobSize} index={active} total={n} onStep={step} interactive={!preview} />
    </div>
  );

  if (preview) return dials;

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      {dials}

      {/* active skill name + nav */}
      <div className="flex w-full max-w-sm items-center justify-between gap-3">
        <button type="button" onClick={() => step(-1)} aria-label={t("Previous skill")} className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-muted transition active:scale-90 hover:text-ink">
          <ChevronLeft className="size-5" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p key={a.dimension} className="dial-pop truncate text-lg font-extrabold leading-tight text-ink">{t(DIMENSION_META[a.dimension].label)}</p>
          <p className="text-xs text-muted">{t("Skill {0} of {1}", active + 1, n)}</p>
        </div>
        <button type="button" onClick={() => step(1)} aria-label={t("Next skill")} className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-muted transition active:scale-90 hover:text-ink">
          <ChevronRight className="size-5" />
        </button>
      </div>

      {/* progress dots */}
      <div className="flex items-center gap-1.5">
        {sorted.map((row, i) => (
          <button key={row.dimension} type="button" aria-label={t(DIMENSION_META[row.dimension].label)} onClick={() => { setActive(i); haptic(); }} className={cx("h-1.5 rounded-full transition-all", i === active ? "w-5 bg-accent" : "w-1.5 bg-line hover:bg-line-strong")} />
        ))}
      </div>
      <p className="text-center text-xs text-muted">{t("Turn the knob or tap ‹ › to switch skills.")}</p>
    </div>
  );
}
