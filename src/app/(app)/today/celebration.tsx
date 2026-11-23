"use client";

import { useEffect, useRef, useState } from "react";
import { enablePush, pushState } from "@/lib/client/push";
import { Flame, Sparkles, Trophy, X, Zap } from "lucide-react";
import { BadgeIcon } from "@/components/badge-icon";
import { ShareMomentButton } from "@/components/moments";
import { Button, ProgressBar } from "@/components/ui";
import { useT } from "@/lib/i18n/client";

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
  referral?: { days: number; inviterName: string } | null;
};

const COLORS = ["#2dd4bf", "#0e9f8a", "#99f6e4", "#5a7ba8", "#9fb3d1", "#ffffff"];

/** Full-screen "session complete" moment with real numbers from today. */
export function CelebrationOverlay({ data, onClose }: { data: Celebration; onClose: () => void }) {
  const t = useT();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={t("Session complete")}>
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
        <button ref={closeRef} type="button" onClick={onClose} aria-label={t("Close")} className="absolute right-3 top-3 rounded-full p-1.5 text-white/80 hover:bg-white/10">
          <X className="size-5" />
        </button>
        <div className="bg-brand px-6 pb-6 pt-8 text-center text-white">
          <p className="text-4xl">{data.levelUp ? "🏆" : "🎉"}</p>
          <h2 className="mt-2 text-2xl font-extrabold">{data.levelUp ? t("Level {0}!", data.level) : t("Session complete!")}</h2>
          <p className="mt-1 text-sm text-white/75">{data.levelUp ? t("You're now a {0}.", t(data.levelName)) : t("Session {0} of 90 done. That's real practice.", data.sessions)}</p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/10 py-3">
              <Zap className="mx-auto size-5 text-teal-300" />
              <p className="mt-1 text-xl font-extrabold tabular-nums">+{data.xpGained}</p>
              <p className="text-[11px] text-white/70">{t("XP today")}</p>
            </div>
            <div className="rounded-2xl bg-white/10 py-3">
              <Flame className="mx-auto size-5 text-teal-300" />
              <p className="mt-1 text-xl font-extrabold tabular-nums">{data.streak}</p>
              <p className="text-[11px] text-white/70">{t("day streak")}</p>
            </div>
            <div className="rounded-2xl bg-white/10 py-3">
              <Trophy className="mx-auto size-5 text-teal-100" />
              <p className="mt-1 text-xl font-extrabold tabular-nums">{data.level}</p>
              <p className="text-[11px] text-white/70">{t("level")}</p>
            </div>
          </div>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>{t("Level {0} · {1}", data.level, t(data.levelName))}</span>
              <span>{data.toNext}{" "}{t("XP to level")}{" "}{data.level + 1}</span>
            </div>
            <ProgressBar value={data.progress} tone="accent" />
          </div>
          {data.badges.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-accent">{t("New badge")}{data.badges.length > 1 ? "s" : ""}{" "}{t("unlocked")}</p>
              {data.badges.map((b) => (
                <div key={b.title} className="flex items-center gap-3 rounded-2xl bg-accent-soft p-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
                    <BadgeIcon name={b.icon} className="size-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold">{t(b.title)}</span>
                    <span className="block text-xs text-muted">{t(b.description)}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
          {data.teaser && (
            <div className="rounded-2xl border border-dashed border-line p-4">
              <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                <Sparkles className="size-3.5" />{" "}{t("Tomorrow")}</p>
              <p className="mt-1 font-serif text-[15px] leading-snug">{t(data.teaser)}</p>
              <RemindMe />
            </div>
          )}
          {data.referral && (
            <div className="rounded-2xl bg-accent-soft p-4 text-sm">
              🎁 <b>{t("{0} din Pro free!", data.referral.days)}</b> {data.referral.inviterName}{" "}{t("ne tumhe invite kiya tha, isliye tum dono ko gift mila.")}</div>
          )}
          {data.finale && <p className="text-sm text-muted">{t("Season complete! Pick the world for your next season on this page.")}</p>}
          <ShareMomentButton
            preferred={data.badges.length ? "badge" : data.levelUp ? "level" : "day"}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-accent text-sm font-bold text-white shadow-sm active:scale-[0.98]"
          >{t("✨ Post as a moment for friends")}</ShareMomentButton>
          <Button className="w-full" onClick={onClose}>{t("Done for today")}</Button>
        </div>
      </div>
    </div>
  );
}

/** The moment people most want tomorrow's episode: offer the reminder here, once, instead of in a settings page. */
function RemindMe() {
  const t = useT();
  const [state, setState] = useState<"hidden" | "ask" | "busy" | "on" | "blocked">("hidden");
  useEffect(() => {
    pushState()
      .then((s) => setState(s === "off" ? "ask" : "hidden"))
      .catch(() => setState("hidden"));
  }, []);
  if (state === "hidden") return null;
  if (state === "on") return <p className="mt-2 text-xs font-semibold text-accent">{t("🔔 Done! Episode ready hote hi bata denge.")}</p>;
  if (state === "blocked") return <p className="mt-2 text-xs text-muted">{t("Notifications blocked hain. Browser settings se allow karo.")}</p>;
  return (
    <button
      type="button"
      disabled={state === "busy"}
      onClick={async () => {
        setState("busy");
        const r = await enablePush();
        setState(r.state === "on" ? "on" : r.state === "denied" ? "blocked" : "ask");
      }}
      className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-white active:scale-95"
    >{t("🔔 Kal yaad dilana")}</button>
  );
}
