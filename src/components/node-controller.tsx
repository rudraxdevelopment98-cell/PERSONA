"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { Check, Compass, Flag, GitBranch, Heart, Megaphone, MessageCircle, Minus, Plus, RotateCcw, Scale, Search, Sparkles, Target, type LucideIcon } from "lucide-react";
import { DIMENSION_META, DIMENSIONS, type Dimension } from "@/lib/domain/dimensions";
import { TARGET_MAX, TARGET_MIN, TARGET_PRESETS, clampTarget, targetPreset } from "@/lib/domain/targets";
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

const round = (n: number) => Math.round(n * 1000) / 1000;
const polar = (cx0: number, cy0: number, r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [round(cx0 + r * Math.cos(a)), round(cy0 + r * Math.sin(a))] as const;
};

// Cockpit presets: reuse the shared target profiles, plus a "Strategic Leader" and "Custom".
const byId = (id: string) => TARGET_PRESETS.find((p) => p.id === id)!.targets;
const COCKPIT_PRESETS: { id: string; name: string; targets: Record<Dimension, number> | null }[] = [
  { id: "businessman", name: "Businessman", targets: byId("businessman") },
  { id: "entrepreneur", name: "Entrepreneur", targets: byId("entrepreneur") },
  { id: "politician", name: "Politician", targets: byId("politician") },
  {
    id: "strategic",
    name: "Strategic Leader",
    targets: { confidence: 84, communication: 82, decision_making: 94, emotional_intelligence: 78, social_intelligence: 78, assertiveness: 86, independent_thinking: 90, critical_thinking: 94, leadership: 92, self_discipline: 86 },
  },
  { id: "custom", name: "Custom", targets: null },
];

const NODE_R = 38; // ring radius, % of the square canvas

/** A large neon rotary dial (270°) for the selected node. */
function NeonDial({ value, current, size = 190 }: { value: number; current: number; size?: number }) {
  const stroke = 13;
  const r = size / 2 - stroke - 4;
  const cx0 = size / 2;
  const cy0 = size / 2;
  const c = 2 * Math.PI * r;
  const span = 0.75;
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
          <linearGradient id="nd-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="55%" stopColor="#2dd4bf" />
            <stop offset="100%" stopColor="#a3e635" />
          </linearGradient>
          <filter id="nd-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g transform={`rotate(135 ${cx0} ${cy0})`}>
          <circle cx={cx0} cy={cy0} r={r} fill="none" stroke="rgba(148,163,184,.22)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${arcLen} ${round(c)}`} />
          <circle cx={cx0} cy={cy0} r={r} fill="none" stroke="url(#nd-grad)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${fillLen} ${round(c)}`} filter="url(#nd-glow)" style={{ transition: "stroke-dasharray 0.22s ease-out" }} />
        </g>
        <circle cx={cxm} cy={cym} r={4} fill="#0a0f1e" stroke="#e2e8f0" strokeWidth={2} />
        <circle cx={hx} cy={hy} r={9} fill="#0a0f1e" stroke="#22d3ee" strokeWidth={4} filter="url(#nd-glow)" style={{ transition: "cx 0.22s ease-out, cy 0.22s ease-out" }} />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span key={value} className="dial-pop text-5xl font-extrabold tabular-nums text-white">{Math.round(value)}</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300/80">target</span>
        <span className={cx("mt-1 text-sm font-bold", gap > 0 ? "text-lime-400" : gap < 0 ? "text-amber-400" : "text-slate-400")}>{gap > 0 ? `+${gap}` : gap}</span>
      </div>
    </div>
  );
}

export function NodeController({ rows, initialTargets, initialPreset }: { rows: Row[]; initialTargets: Record<string, number> | null; initialPreset: string | null }) {
  const t = useT();
  const sorted = useMemo(() => [...rows].sort((a, b) => DIMENSIONS.indexOf(a.dimension) - DIMENSIONS.indexOf(b.dimension)), [rows]);
  const currentMap = useMemo(() => Object.fromEntries(sorted.map((r) => [r.dimension, Math.round(r.current)])) as Record<Dimension, number>, [sorted]);

  const start = useMemo<Record<Dimension, number>>(() => {
    const out = {} as Record<Dimension, number>;
    for (const d of DIMENSIONS) {
      const v = initialTargets?.[d];
      out[d] = typeof v === "number" ? clampTarget(v) : clampTarget((currentMap[d] ?? 50) + 10);
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

  const applyPreset = (p: (typeof COCKPIT_PRESETS)[number]) => {
    if (p.targets) setTargets({ ...p.targets });
    setPreset(p.id);
    setSaved(false);
    haptic(12);
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

  // drag the big dial
  const dialWrap = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const setFromPointer = (clientX: number, clientY: number) => {
    const el = dialWrap.current;
    if (!el) return;
    const b = el.getBoundingClientRect();
    const dx = clientX - (b.left + b.width / 2);
    const dy = clientY - (b.top + b.height / 2);
    let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (deg < -135) deg = deg < -157.5 ? 135 : -135;
    if (deg > 135) deg = 135;
    setOne(active, TARGET_MIN + ((deg + 135) / 270) * (TARGET_MAX - TARGET_MIN));
  };

  const av = targets[active];
  const ac = currentMap[active] ?? 0;
  const ActiveIcon = DIM_ICON[active];

  const avgCur = Math.round(sorted.reduce((s, r) => s + r.current, 0) / Math.max(1, sorted.length));
  const avgTgt = Math.round(DIMENSIONS.reduce((s, d) => s + targets[d], 0) / DIMENSIONS.length);

  // node positions on the ring
  const nodes = sorted.map((r, i) => {
    const deg = -90 + (i * 360) / sorted.length;
    const [x, y] = polar(50, 50, NODE_R, deg);
    return { ...r, x, y, deg };
  });

  return (
    <div className="space-y-5">
      {/* cockpit canvas */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-400/15 bg-[#070b17] p-4 shadow-[0_18px_60px_-20px_rgba(34,211,238,0.35)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(34,211,238,0.14),transparent_60%)]" />
        <p className="relative mb-1 text-center text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-300/70">{t("Personality core")}</p>

        <div className="relative mx-auto aspect-square w-full max-w-[360px]">
          {/* connecting lines */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
            {nodes.map((n) => (
              <line key={n.dimension} x1={50} y1={50} x2={n.x} y2={n.y} stroke={active === n.dimension ? "rgba(34,211,238,.85)" : "rgba(45,212,191,.28)"} strokeWidth={active === n.dimension ? 0.8 : 0.4} className={active === n.dimension ? "node-line-flow" : undefined} strokeLinecap="round" />
            ))}
          </svg>

          {/* central core */}
          <button
            type="button"
            onClick={() => haptic(8)}
            className="node-core-glow absolute left-1/2 top-1/2 flex aspect-square w-[27%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-cyan-300/40 bg-[radial-gradient(circle_at_50%_35%,#0e7490,#0a1b2e)] text-white"
            aria-label={t("Personality core")}
          >
            <span className="text-2xl font-extrabold leading-none tabular-nums">{avgCur}</span>
            <span className="mt-0.5 text-[8px] font-bold uppercase tracking-widest text-cyan-200/80">core</span>
            <span className="text-[9px] font-semibold text-lime-300/90">→ {avgTgt}</span>
          </button>

          {/* skill nodes */}
          {nodes.map((n) => {
            const on = active === n.dimension;
            const Icon = DIM_ICON[n.dimension];
            const cur = Math.round(n.current);
            const tgt = targets[n.dimension];
            return (
              <button
                key={n.dimension}
                type="button"
                onClick={() => { setActive(n.dimension); haptic(6); }}
                aria-label={`${t(DIMENSION_META[n.dimension].label)} ${t("Now {0} · you want {1}", cur, tgt)}`}
                aria-pressed={on}
                className={cx(
                  "absolute flex aspect-square w-[17%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border transition-all duration-300",
                  on
                    ? "z-10 scale-125 border-cyan-300 bg-[#0b2436] shadow-[0_0_18px_rgba(34,211,238,0.9),0_0_36px_rgba(34,211,238,0.5)]"
                    : "border-teal-300/25 bg-[#0c1526] hover:border-teal-300/60",
                )}
                style={{ left: `${n.x}%`, top: `${n.y}%` }}
              >
                {/* current-fill ring */}
                <svg viewBox="0 0 36 36" className="absolute inset-0 size-full -rotate-90" aria-hidden>
                  <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(148,163,184,.18)" strokeWidth="2.5" />
                  <circle cx="18" cy="18" r="15" fill="none" stroke={on ? "#22d3ee" : "#2dd4bf"} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={`${round((cur / 100) * 2 * Math.PI * 15)} 999`} style={{ transition: "stroke-dasharray .4s ease-out" }} />
                </svg>
                <Icon className={cx("relative", on ? "size-5 text-white" : "size-4 text-teal-200")} strokeWidth={2} />
              </button>
            );
          })}
        </div>
      </div>

      {/* presets */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {COCKPIT_PRESETS.map((p) => {
          const on = preset === p.id;
          return (
            <button key={p.id} type="button" onClick={() => applyPreset(p)} className={cx("shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition active:scale-95", on ? "border-cyan-400 bg-cyan-400/15 text-cyan-700 dark:text-cyan-300" : "border-line bg-surface text-muted hover:border-line-strong")}>
              {t(p.name)}
            </button>
          );
        })}
      </div>

      {/* selected node panel */}
      <div className="rounded-3xl border border-cyan-400/15 bg-[#070b17] p-5">
        <div className="mb-1 flex items-center justify-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-300"><ActiveIcon className="size-5" /></span>
          <h2 className="text-lg font-extrabold text-white">{t(DIMENSION_META[active].label)}</h2>
        </div>
        <div className="mb-3 flex items-center justify-center gap-4 text-xs font-semibold">
          <span className="text-slate-400">{t("Now")} <span className="text-base font-extrabold text-white">{ac}</span></span>
          <span className="text-slate-500">→</span>
          <span className="text-cyan-300">{t("Target")} <span className="text-base font-extrabold text-cyan-200">{av}</span></span>
          <span className={cx("rounded-full px-2 py-0.5", av - ac > 0 ? "bg-lime-400/15 text-lime-400" : "bg-slate-600/30 text-slate-300")}>{av - ac > 0 ? `+${av - ac}` : av - ac}</span>
        </div>

        <div
          ref={dialWrap}
          className="mx-auto w-fit cursor-grab touch-none select-none active:cursor-grabbing"
          onPointerDown={(e) => { dragging.current = true; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); setFromPointer(e.clientX, e.clientY); haptic(8); }}
          onPointerMove={(e) => { if (dragging.current) setFromPointer(e.clientX, e.clientY); }}
          onPointerUp={() => { dragging.current = false; }}
          onPointerCancel={() => { dragging.current = false; }}
        >
          <NeonDial value={av} current={ac} />
        </div>

        <div className="mx-auto mt-3 flex max-w-xs items-center justify-center gap-4">
          <button type="button" aria-label={t("Lower")} onClick={() => setOne(active, av - 1)} className="flex size-11 items-center justify-center rounded-full border border-cyan-400/30 bg-[#0c1526] text-cyan-300 transition active:scale-90 hover:border-cyan-300"><Minus className="size-5" /></button>
          <span className="w-14 text-center text-2xl font-extrabold tabular-nums text-white">{av}</span>
          <button type="button" aria-label={t("Raise")} onClick={() => setOne(active, av + 1)} className="flex size-11 items-center justify-center rounded-full border border-cyan-400/30 bg-[#0c1526] text-cyan-300 transition active:scale-90 hover:border-cyan-300"><Plus className="size-5" /></button>
        </div>
      </div>

      {/* save */}
      <div className="sticky bottom-20 z-10 flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-[#070b17]/95 p-2.5 backdrop-blur sm:bottom-4">
        <button type="button" onClick={() => { const out = {} as Record<Dimension, number>; for (const d of DIMENSIONS) out[d] = clampTarget((currentMap[d] ?? 50) + 5); setTargets(out); setPreset("custom"); setSaved(false); }} className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-400 transition hover:text-white">
          <RotateCcw className="size-4" /> {t("Reset")}
        </button>
        <button type="button" onClick={save} disabled={pending} className={cx("flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-[#06121f] transition active:scale-[0.98]", saved ? "bg-lime-400" : "bg-cyan-400", pending && "opacity-70")}>
          {saved ? (<><Check className="size-4" /> {t("Saved")}</>) : pending ? t("Saving…") : t("Save my targets")}
        </button>
      </div>
      <p className="-mt-2 text-center text-xs text-muted">{t("Your stories, scenarios and assessments will lean toward the skills with the biggest gap.")}</p>
    </div>
  );
}
