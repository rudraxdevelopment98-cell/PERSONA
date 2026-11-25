"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "./ui";

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Short, soft haptic tap on supported devices. No-op where unsupported or reduced-motion. */
export function haptic(ms = 12) {
  try {
    if (!reduced() && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(ms);
  } catch {
    /* ignore */
  }
}

/**
 * Counts a number up to its value once it scrolls into view (or on mount).
 * Respects reduced-motion (shows the final value immediately).
 */
export function AnimatedNumber({
  value,
  duration = 900,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(reduced() ? value : 0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (reduced()) {
      setDisplay(value);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const run = () => {
      if (started.current) return;
      started.current = true;
      const from = 0;
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setDisplay(from + (value - from) * eased);
        if (p < 1) requestAnimationFrame(tick);
        else setDisplay(value);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && run()),
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration]);

  const n = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString();
  return (
    <span ref={ref} className={cx("tabular-nums", className)}>
      {prefix}{n}{suffix}
    </span>
  );
}

/** Fades + rises its children in when they scroll into view. `delay` staggers siblings. */
export function Reveal({ children, delay = 0, className, as: As = "div" }: { children: ReactNode; delay?: number; className?: string; as?: "div" | "li" | "section" }) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (reduced()) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setShown(true)),
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    // @ts-expect-error polymorphic ref
    <As ref={ref} className={cx("reveal", shown && "reveal-in", className)} style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}>
      {children}
    </As>
  );
}

/** A progress bar that fills from 0 to `value` on mount (or instantly with reduced-motion). */
export function GrowBar({ value, className, tone = "primary" }: { value: number; className?: string; tone?: "primary" | "accent" | "sun" }) {
  const v = Math.max(0, Math.min(100, value));
  const [w, setW] = useState(reduced() ? v : 0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reduced()) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && setW(v)), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [v]);
  const fill = { primary: "bg-primary", accent: "bg-accent", sun: "bg-sun" }[tone];
  return (
    <div ref={ref} className={cx("h-2 w-full overflow-hidden rounded-full bg-primary-soft", className)} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx("h-full rounded-full transition-[width] duration-[900ms] ease-out", fill)} style={{ width: `${w}%` }} />
    </div>
  );
}
