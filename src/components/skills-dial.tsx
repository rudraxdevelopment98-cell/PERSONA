"use client";

import { useEffect, useRef, useState } from "react";
import { Compass, Flag, GitBranch, Heart, Megaphone, MessageCircle, Scale, Search, Sparkles, Target, type LucideIcon } from "lucide-react";
import { DIMENSION_META, DIMENSIONS, type Dimension } from "@/lib/domain/dimensions";
import { DEFAULT_DIAL, DIAL_STORAGE_KEY, dialTheme, isDarkSurface, type DialTheme, type Surface } from "@/lib/domain/dial-themes";
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
      flatGreen: "bg-[#0e5a4f]",
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
function Disc({ surface, size, children, className }: { surface: Surface; size: number; children: React.ReactNode; className?: string }) {
  if (surface === "metal") {
    return (
      <div className={cx("knob-metal rounded-full p-[7px]", className)} style={{ width: size, height: size }}>
        <div className="knob-metal-inner relative flex size-full items-center justify-center rounded-full">{children}</div>
      </div>
    );
  }
  return (
    <div className={cx("relative flex items-center justify-center rounded-full", surfaceClass(surface), className)} style={{ width: size, height: size }}>
      {children}
    </div>
  );
}

const polar = (cx0: number, cy0: number, r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx0 + r * Math.cos(a), cy0 + r * Math.sin(a)] as const;
};

/** The value gauge: an arc that fills to the score, with the number in the centre. */
function ValueGauge({ theme, value, delta, size }: { theme: DialTheme; value: number; delta: number | null; size: number }) {
  const dark = isDarkSurface(theme.valueSurface);
  const stroke = 10;
  const inset = 16;
  const r = size / 2 - inset;
  const c = 2 * Math.PI * r;
  const arcLen = theme.arc * c;
  const fillLen = (Math.max(0, Math.min(100, value)) / 100) * arcLen;
  const rot = theme.arc < 1 ? 135 : -90; // 270° gauges open at the bottom; full rings start at the top
  const gid = `g-${theme.id}`;
  const cx0 = size / 2;
  const cy0 = size / 2;

  const ticks =
    theme.ticks === "major" || theme.ticks === "segments"
      ? Array.from({ length: theme.ticks === "segments" ? 11 : 21 }, (_, i) => i)
      : [];

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
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${arcLen} ${c}`}
            strokeDashoffset={0}
            {...(theme.ticks === "dots" ? { strokeDasharray: `1.5 9`, strokeWidth: stroke - 3 } : {})}
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
        <span key={value} className={cx("dial-pop text-3xl font-extrabold leading-none tabular-nums", dark ? "text-white" : "text-ink")}>{Math.round(value)}</span>
        {delta != null && <span className="mt-0.5"><Delta value={delta} /></span>}
      </div>
    </Disc>
  );
}

/** The skill knob: the active skill's icon in a themed knob, name below. */
function SkillKnob({ theme, dimension, label, size }: { theme: DialTheme; dimension: Dimension; label: string; size: number }) {
  const Icon = ICON[dimension];
  const dark = isDarkSurface(theme.knobSurface);
  return (
    <div className="flex flex-col items-center gap-2">
      <Disc surface={theme.knobSurface} size={size} className={theme.knobSurface === "neon" ? "knob-ring-spin" : undefined}>
        <span key={dimension} className="dial-pop">
          <Icon className={cx("size-7", dark ? "text-white" : "text-accent")} strokeWidth={2} />
        </span>
      </Disc>
      <span key={label} className="dial-pop max-w-[9rem] text-center text-sm font-bold leading-tight">{label}</span>
    </div>
  );
}

/**
 * Themed skill dials: a value gauge ⇄ a skill knob, in the chosen theme. Scrolling
 * the section turns through the skills with animated transitions. `theme` forces a
 * theme (for the Settings preview); otherwise it follows the saved choice.
 */
export function SkillsDial({ rows, theme: forced, preview }: { rows: Row[]; theme?: string; preview?: boolean }) {
  const t = useT();
  const sorted = [...rows].sort((a, b) => DIMENSIONS.indexOf(a.dimension) - DIMENSIONS.indexOf(b.dimension));
  const n = sorted.length;

  const [themeId, setThemeId] = useState(forced ?? DEFAULT_DIAL);
  useEffect(() => {
    if (forced) return;
    try {
      setThemeId(localStorage.getItem(DIAL_STORAGE_KEY) || DEFAULT_DIAL);
    } catch {
      /* ignore */
    }
    const onChange = () => {
      try {
        setThemeId(localStorage.getItem(DIAL_STORAGE_KEY) || DEFAULT_DIAL);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("p90-dial-theme", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("p90-dial-theme", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [forced]);
  const theme = dialTheme(themeId);

  const STEP_PX = 70;
  const outerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (preview) return;
    const el = outerRef.current;
    if (!el) return;
    let ticking = false;
    const run = () => {
      const top = el.getBoundingClientRect().top;
      const total = el.offsetHeight - 260;
      const p = Math.max(0, Math.min(1, -top / Math.max(1, total)));
      setActive(Math.round(p * (n - 1)));
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
  }, [n, preview]);

  const a = sorted[Math.max(0, Math.min(n - 1, active))];

  const Dials = (
    <div className="flex items-center justify-center gap-3 sm:gap-5">
      <ValueGauge theme={theme} value={a.current} delta={a.baseline != null ? a.current - a.baseline : null} size={preview ? 92 : 140} />
      <span className="text-muted">⇄</span>
      <SkillKnob theme={theme} dimension={a.dimension} label={t(DIMENSION_META[a.dimension].label)} size={preview ? 72 : 112} />
    </div>
  );

  if (preview) return Dials;

  return (
    <div ref={outerRef} className="relative" style={{ height: 260 + (n - 1) * STEP_PX }}>
      <div className="sticky top-24 flex h-[260px] flex-col items-center justify-center gap-4">
        {Dials}
        {/* progress dots */}
        <div className="flex items-center gap-1.5">
          {sorted.map((row, i) => (
            <span key={row.dimension} className={cx("h-1.5 rounded-full transition-all", i === active ? "w-5 bg-accent" : "w-1.5 bg-line")} />
          ))}
        </div>
      </div>
    </div>
  );
}
