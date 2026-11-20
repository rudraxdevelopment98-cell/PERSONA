"use client";

import { useEffect, useRef } from "react";
import { Flame, Sparkles, Trophy, X, Zap } from "lucide-react";
import { BadgeIcon } from "@/components/badge-icon";
import { ShareProgress } from "@/components/share-progress";
import { ShareMomentButton } from "@/components/moments";
import { Button, ProgressBar } from "@/components/ui";

export type Celebration = {
  xpGained: number;
  xp: number;
  level: number;
  levelName: string;
  levelUp: boolean;
  progress: number;
  toNext: number;
  streak: number;
  sessions: number;
  badges: { title: string; icon: string; description: string }[];
  teaser: string | null;
  finale: boolean;
};

const COLORS = ["#2dd4bf", "#fbbf24", "#f97316", "#60a5fa", "#a78bfa", "#f472b6"];

/** Full-screen "session complete" moment with real numbers from today. */
export function CelebrationOverlay({ data, onClose }: { data: Celebration; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Session complete">
      <div className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden" aria-hidden>
        {Array.from({ length: 36 }, (_, i) => (
          <span
            key={i}
            className="confetti absolute top-[-10%] block h-3 w-2 rounded-sm"
            style={{ left: `${(i * 37) % 100}%`, background: COLORS[i % COLORS.length], animationDelay: `${(i % 9) * 0.12}s`, animationDuration: `${2.2 + (i % 5) * 0.3}s` }}
          />
        ))}
      </div>
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-surface shadow-raised motion-safe:animate-rise">
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-full p-1.5 text-white/80 hover:bg-white/10">
          <X className="size-5" />
        </button>
        <div className="bg-brand px-6 pb-6 pt-8 text-center text-white">
          <p className="text-4xl">{data.levelUp ? "🏆" : "🎉"}</p>
          <h2 className="mt-2 text-2xl font-extrabold">{data.levelUp ? `Level ${data.level}!` : "Session complete!"}</h2>
          <p className="mt-1 text-sm text-white/75">{data.levelUp ? `You're now a ${data.levelName}.` : `Session ${data.sessions} of 90 done. That's real practice.`}</p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/10 py-3">
              <Zap className="mx-auto size-5 text-teal-300" />
              <p className="mt-1 text-xl font-extrabold tabular-nums">+{data.xpGained}</p>
              <p className="text-[11px] text-white/70">XP today</p>
            </div>
            <div className="rounded-2xl bg-white/10 py-3">
              <Flame className="mx-auto size-5 text-amber-300" />
              <p className="mt-1 text-xl font-extrabold tabular-nums">{data.streak}</p>
              <p className="text-[11px] text-white/70">day streak</p>
            </div>
            <div className="rounded-2xl bg-white/10 py-3">
              <Trophy className="mx-auto size-5 text-sky-200" />
              <p className="mt-1 text-xl font-extrabold tabular-nums">{data.level}</p>
              <p className="text-[11px] text-white/70">level</p>
            </div>
          </div>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>Level {data.level} · {data.levelName}</span>
              <span>{data.toNext} XP to level {data.level + 1}</span>
            </div>
            <ProgressBar value={data.progress} tone="accent" />
          </div>
          {data.badges.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-accent">New badge{data.badges.length > 1 ? "s" : ""} unlocked</p>
              {data.badges.map((b) => (
                <div key={b.title} className="flex items-center gap-3 rounded-2xl bg-accent-soft p-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
                    <BadgeIcon name={b.icon} className="size-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold">{b.title}</span>
                    <span className="block text-xs text-muted">{b.description}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
          {data.teaser && (
            <div className="rounded-2xl border border-dashed border-line p-4">
              <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                <Sparkles className="size-3.5" /> Tomorrow
              </p>
              <p className="mt-1 font-serif text-[15px] leading-snug">{data.teaser}</p>
            </div>
          )}
          {data.finale && <p className="text-sm text-muted">Season complete! Pick the world for your next season on this page.</p>}
          <ShareMomentButton
            preferred={data.badges.length ? "badge" : data.levelUp ? "level" : "day"}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-400 via-pink-500 to-violet-500 text-sm font-bold text-white shadow-sm active:scale-[0.98]"
          >
            ✨ Post as a moment for friends
          </ShareMomentButton>
          <ShareProgress label="Share today's win" />
          <Button className="w-full" onClick={onClose}>
            Done for today
          </Button>
        </div>
      </div>
    </div>
  );
}
