"use client";

import { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { cx } from "@/components/ui";

const STAGES = [
  "Reading your check-in",
  "Choosing today's world",
  "Casting the characters",
  "Writing the episode",
  "Adding the twist",
  "Building your scenarios",
  "Planning today's mission",
];

const FACTS = [
  "Spotlight effect: people notice your awkward moments far less than you think.",
  "Naming a feeling (\"I'm anxious\") tends to make it easier to handle.",
  "Small, specific goals beat big vague ones - \"speak once in the meeting\" works better than \"be confident\".",
  "Confidence usually follows action, not the other way round.",
  "Pausing before you reply gives you time to choose your words instead of reacting.",
  "Most decisions are reversible. Treat them like experiments, not verdicts.",
  "Asking a good question is often more persuasive than making a strong point.",
  "Your brain treats rehearsed situations as more familiar, so practising here makes real life feel easier.",
];

/** Engaging progress while the AI writes today's session (usually 1-2 minutes). */
export function WritingEpisode({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  const secs = (now - startedAt) / 1000;
  // Eases towards the end without ever claiming to be finished.
  const progress = Math.min(0.95, 1 - Math.exp(-secs / 40));
  const stage = Math.min(STAGES.length - 1, Math.floor(progress * STAGES.length * 1.02));
  const fact = FACTS[Math.floor(secs / 7) % FACTS.length];

  return (
    <div className="space-y-4" aria-live="polite">
      <div className="h-2 w-full overflow-hidden rounded-full bg-primary-soft">
        <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      <ol className="grid gap-1.5 sm:grid-cols-2">
        {STAGES.map((s, i) => (
          <li key={s} className={cx("flex items-center gap-2 text-sm", i > stage ? "text-muted/60" : i === stage ? "font-semibold text-ink" : "text-muted")}>
            <span
              className={cx(
                "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px]",
                i < stage ? "bg-success text-white" : i === stage ? "bg-accent text-white motion-safe:animate-pulse" : "bg-bg",
              )}
            >
              {i < stage ? <Check className="size-3" strokeWidth={3} /> : i === stage ? <Sparkles className="size-3" /> : null}
            </span>
            {s}
          </li>
        ))}
      </ol>
      <p key={fact} className="rounded-xl bg-bg px-4 py-3 text-sm leading-relaxed motion-safe:animate-rise">
        <span className="font-bold text-accent">Did you know? </span>
        {fact}
      </p>
    </div>
  );
}
