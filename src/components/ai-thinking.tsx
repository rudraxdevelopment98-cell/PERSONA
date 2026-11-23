"use client";

import { useEffect, useState } from "react";
import { cx } from "@/components/ui";
import { useT } from "@/lib/i18n/client";

/**
 * Shown while the AI is working: an orbiting "mind", a status line that changes
 * every few seconds and a shimmer bar, so a wait feels alive instead of stuck.
 */
export function AIThinking({
  steps,
  compact = false,
  className,
}: {
  /** Status lines shown in turn, e.g. ["Reading your answer…", "Comparing with strong replies…"]. */
  steps: string[];
  compact?: boolean;
  className?: string;
}) {
  const t = useT();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (steps.length < 2) return;
    const t = setInterval(() => setI((n) => Math.min(n + 1, steps.length - 1)), 2600);
    return () => clearInterval(t);
  }, [steps.length]);
  const size = compact ? "size-9" : "size-14";
  return (
    <div role="status" aria-live="polite" className={cx("flex items-center gap-4 rounded-2xl bg-bg p-4", className)}>
      <div className={cx("relative shrink-0", size)} aria-hidden>
        <div className="think-breathe absolute inset-[28%] rounded-full bg-primary" />
        <div className="think-orbit absolute inset-0">
          <span className="absolute left-1/2 top-0 size-2 -translate-x-1/2 rounded-full bg-accent" />
        </div>
        <div className="think-orbit-slow absolute inset-[12%]">
          <span className="absolute bottom-0 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-primary/70" />
        </div>
        <div className="absolute inset-0 rounded-full border border-dashed border-line-strong" />
      </div>
      <div className="min-w-0 flex-1">
        <p key={i} className="animate-rise text-sm font-medium">{t(steps[i])}</p>
        <div className="think-shimmer mt-2 h-1.5 w-full rounded-full bg-line" />
      </div>
    </div>
  );
}
