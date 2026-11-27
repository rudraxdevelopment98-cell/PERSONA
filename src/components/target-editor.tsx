"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { Briefcase, Check, Compass, Flag, GitBranch, GraduationCap, Heart, Landmark, Leaf, Megaphone, MessageCircle, Mic, Minus, Palette, Plus, RotateCcw, Rocket, Scale, Search, Sparkles, Star, Target, Zap, type LucideIcon } from "lucide-react";
import { DIMENSION_META, DIMENSIONS, type Dimension } from "@/lib/domain/dimensions";
import { TARGET_MAX, TARGET_MIN, TARGET_PRESETS, clampTarget, defaultTargets, targetPreset } from "@/lib/domain/targets";
import { saveTargets } from "@/app/(app)/goals-actions";
import { haptic } from "./motion";
import { cx } from "./ui";
import { useT } from "@/lib/i18n/client";

type Row = { dimension: Dimension; current: number; baseline?: number };

const DIM_ICON: Record<Dimension, LucideIcon> = {
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

const PRESET_ICON: Record<string, LucideIcon> = {
  briefcase: Briefcase,
  rocket: Rocket,
  landmark: Landmark,
  flag: Flag,
  mic: Mic,
  palette: Palette,
  "graduation-cap": GraduationCap,
  zap: Zap,
  leaf: Leaf,
  star: Star,
};

const round = (n: number) => Math.round(n * 1000) / 1000;
const polar = (cx0: number, cy0: number, r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [round(cx0 + r * Math.cos(a)), round(cy0 + r * Math.sin(a))] as const;
};

/** A draggable 270° target knob: turn it to set how strong you want this skill (30–100). */
function TargetKnob({ value, current, size = 200 }: { value: number; current: number; size?: number }) {
  const stroke = 14;
  const r = size / 2 - stroke - 4;
  const cx0 = size / 2;
  const cy0 = size / 2;
  const c = 2 * Math.PI * r;
  const span = 0.75; // 270°
  const arcLen = round(span * c);
  const frac = (clampTarget(value) - TARGET_MIN) / (TARGET_MAX - TARGET_MIN);
  const fillLen = round(frac * arcLen);
  const curFrac = (Math.max(TARGET_MIN, Math.min(TARGET_MAX, current)) - TARGET_MIN) / (TARGET_MAX - TARGET_MIN);
  const valDeg = -135 + frac * 270;
  const curDeg = -135 + curFrac * 270;
  const [hx, hy] = polar(cx0, cy0, r, valDeg);
  const [cxm, cym] = polar(cx0, cy0, r, curDeg);
  const gap = Math.round(value - current);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden>
        <defs>
          <linearGradient id="tk-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-accent)" />
            <stop offset="100%" stopColor="var(--color-primary)" />
          </linearGradient>
        </defs>
        <g transform={`rotate(135 ${cx0} ${cy0})`}>
          <circle cx={cx0} cy={cy0} r={r} fill="none" stroke="var(--color-primary-soft)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${arcLen} ${round(c)}`} />
          <circle cx={cx0} cy={cy0} r={r} fill="none" stroke="url(#tk-grad)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${fillLen} ${round(c)}`} style={{ transition: "stroke-dasharray 0.25s ease-out" }} />
        </g>
        {/* current-score marker */}
        <circle cx={cxm} cy={cym} r={4} fill="var(--color-surface)" stroke="var(--color-ink)" strokeWidth={2} />
        {/* draggable handle */}
        <circle cx={hx} cy={hy} r={9} fill="var(--color-surface)" stroke="var(--color-accent)" strokeWidth={4} style={{ transition: "cx 0.25s ease-out, cy 0.25s ease-out" }} />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span key={value} className="dial-pop text-5xl font-extrabold tabular-nums text-ink">{Math.round(value)}</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">target</span>
        <span className={cx("mt-1 text-sm font-bold", gap > 0 ? "text-success" : gap < 0 ? "text-warning" : "text-muted")}>{gap > 0 ? `+${gap}` : gap}</span>
      </div>
    </div>
  );
}

export function TargetEditor({ rows, initialTargets, initialPreset }: { rows: Row[]; initialTargets: Record<string, number> | null; initialPreset: string | null }) {
  const t = useT();
  const sorted = useMemo(() => [...rows].sort((a, b) => DIMENSIONS.indexOf(a.dimension) - DIMENSIONS.indexOf(b.dimension)), [rows]);
  const currentMap = useMemo(() => Object.fromEntries(sorted.map((r) => [r.dimension, Math.round(r.current)])) as Record<Dimension, number>, [sorted]);

  const start = useMemo<Record<Dimension, number>>(() => {
    const base = defaultTargets();
    const out = { ...base };
    for (const d of DIMENSIONS) {
      const v = initialTargets?.[d];
      if (typeof v === "number") out[d] = clampTarget(v);
      else out[d] = Math.max(base[d], clampTarget((currentMap[d] ?? 50) + 10));
    }
    return out;
  }, [initialTargets, currentMap]);

  const [targets, setTargets] = useState<Record<Dimension, number>>(start);
  const [preset, setPreset] = useState<string | null>(initialPreset);
  const [active, setActive] = useState<Dimension>(sorted[0]?.dimension ?? "confidence");
  const [saved, setSaved] = useState(initialTargets != null);
  const [pending, startTransition] = useTransition();

  const setOne = useCallback((dim: Dimension, v: number) => {
    setTargets((prev) => ({ ...prev, [dim]: clampTarget(v) }));
    setPreset("custom");
    setSaved(false);
  }, []);

  const applyPreset = (id: string) => {
    const p = targetPreset(id);
    if (!p) return;
    setTargets({ ...p.targets });
    setPreset(id);
    setSaved(false);
    haptic();
  };

  const resetToCurrent = () => {
    const out = {} as Record<Dimension, number>;
    for (const d of DIMENSIONS) out[d] = clampTarget((currentMap[d] ?? 50) + 5);
    setTargets(out);
    setPreset("custom");
    setSaved(false);
  };

  const save = () => {
    startTransition(async () => {
      const res = await saveTargets({ targets, preset });
      if (!res.error) {
        setSaved(true);
        haptic(18);
      }
    });
  };

  // drag the knob
  const knobWrap = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const setFromPointer = (clientX: number, clientY: number) => {
    const el = knobWrap.current;
    if (!el) return;
    const b = el.getBoundingClientRect();
    const dx = clientX - (b.left + b.width / 2);
    const dy = clientY - (b.top + b.height / 2);
    let deg = (Math.atan2(dx, -dy) * 180) / Math.PI; // 0 = top, clockwise +
    if (deg < -135) deg = deg < -157.5 ? 135 : -135; // snap the dead zone
    if (deg > 135) deg = 135;
    const frac = (deg + 135) / 270;
    setOne(active, TARGET_MIN + frac * (TARGET_MAX - TARGET_MIN));
  };

  const av = targets[active];
  const ac = currentMap[active] ?? 0;
  const ActiveIcon = DIM_ICON[active];

  return (
    <div className="space-y-6">
      {/* presets */}
      <section>
        <h2 className="mb-2 text-sm font-bold text-ink">{t("Quick profiles")}</h2>
        <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {TARGET_PRESETS.map((p) => {
            const Icon = PRESET_ICON[p.icon] ?? Star;
            const on = preset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={cx("flex w-28 shrink-0 flex-col items-start gap-1.5 rounded-2xl border p-3 text-left transition active:scale-95", on ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-line-strong")}
              >
                <span className={cx("flex size-9 items-center justify-center rounded-full", on ? "bg-accent text-white" : "bg-primary-soft text-accent")}>
                  <Icon className="size-5" />
                </span>
                <span className="text-sm font-bold leading-tight text-ink">{t(p.name)}</span>
                <span className="text-[11px] leading-snug text-muted">{t(p.blurb)}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* active skill — big draggable knob */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="mb-3 flex items-center justify-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary-soft text-accent"><ActiveIcon className="size-5" /></span>
          <h2 className="text-lg font-extrabold text-ink">{t(DIMENSION_META[active].label)}</h2>
        </div>

        <div
          ref={knobWrap}
          className="mx-auto w-fit cursor-grab touch-none select-none active:cursor-grabbing"
          onPointerDown={(e) => { dragging.current = true; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); setFromPointer(e.clientX, e.clientY); haptic(8); }}
          onPointerMove={(e) => { if (dragging.current) setFromPointer(e.clientX, e.clientY); }}
          onPointerUp={() => { dragging.current = false; }}
          onPointerCancel={() => { dragging.current = false; }}
        >
          <TargetKnob value={av} current={ac} />
        </div>

        <p className="mt-1 text-center text-sm text-muted">{t("Now {0} · you want {1}", ac, av)}</p>

        {/* precise controls */}
        <div className="mx-auto mt-4 flex max-w-sm items-center gap-3">
          <button type="button" aria-label={t("Lower")} onClick={() => setOne(active, av - 1)} className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-muted transition active:scale-90 hover:text-ink"><Minus className="size-5" /></button>
          <input
            type="range"
            min={TARGET_MIN}
            max={TARGET_MAX}
            value={av}
            onChange={(e) => setOne(active, Number(e.target.value))}
            aria-label={t("Target for {0}", t(DIMENSION_META[active].label))}
            className="target-range h-2 flex-1 cursor-pointer appearance-none rounded-full"
            style={{ background: `linear-gradient(to right, var(--color-accent) ${((av - TARGET_MIN) / (TARGET_MAX - TARGET_MIN)) * 100}%, var(--color-primary-soft) ${((av - TARGET_MIN) / (TARGET_MAX - TARGET_MIN)) * 100}%)` }}
          />
          <button type="button" aria-label={t("Raise")} onClick={() => setOne(active, av + 1)} className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-muted transition active:scale-90 hover:text-ink"><Plus className="size-5" /></button>
        </div>
      </section>

      {/* all skills list / selector */}
      <section>
        <h2 className="mb-2 text-sm font-bold text-ink">{t("All 10 skills")}</h2>
        <ul className="space-y-1.5">
          {sorted.map((r) => {
            const tv = targets[r.dimension];
            const cvRaw = Math.round(r.current);
            const on = active === r.dimension;
            const Icon = DIM_ICON[r.dimension];
            const gap = tv - cvRaw;
            return (
              <li key={r.dimension}>
                <button type="button" onClick={() => { setActive(r.dimension); haptic(6); }} className={cx("flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition", on ? "border-accent bg-accent-soft" : "border-transparent bg-surface hover:bg-primary-soft/40")}>
                  <span className={cx("flex size-8 shrink-0 items-center justify-center rounded-full", on ? "bg-accent text-white" : "bg-primary-soft text-accent")}><Icon className="size-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-ink">{t(DIMENSION_META[r.dimension].label)}</span>
                      <span className="shrink-0 text-xs font-bold tabular-nums text-muted">{cvRaw} <span className="text-accent">→ {tv}</span></span>
                    </span>
                    <span className="relative mt-1.5 block h-1.5 rounded-full bg-primary-soft">
                      <span className="absolute inset-y-0 left-0 rounded-full bg-accent/40" style={{ width: `${cvRaw}%` }} />
                      <span className="absolute -top-0.5 h-2.5 w-1 rounded-full bg-accent" style={{ left: `calc(${tv}% - 2px)` }} title={t("Target {0}", tv)} />
                    </span>
                  </span>
                  {gap > 0 && <span className="shrink-0 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-bold text-success">+{gap}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* save bar */}
      <div className="sticky bottom-20 z-10 flex items-center gap-2 rounded-2xl border border-line bg-surface/95 p-2.5 shadow-card backdrop-blur sm:bottom-4">
        <button type="button" onClick={resetToCurrent} className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted transition hover:text-ink">
          <RotateCcw className="size-4" /> {t("Reset")}
        </button>
        <button type="button" onClick={save} disabled={pending} className={cx("flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition active:scale-[0.98]", saved ? "bg-success" : "bg-accent", pending && "opacity-70")}>
          {saved ? (<><Check className="size-4" /> {t("Saved")}</>) : pending ? t("Saving…") : t("Save my targets")}
        </button>
      </div>
      <p className="-mt-2 text-center text-xs text-muted">{t("Your stories, scenarios and assessments will lean toward the skills with the biggest gap.")}</p>
    </div>
  );
}
