"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useT } from "@/lib/i18n/client";

const KEY = "p90-pro-banner-until";
const SNOOZE_DAYS = 7;

/**
 * A gentle, dismissible "Go Pro" banner for free users, shown on app open.
 * Dismissing it snoozes the banner for a week (per device); it never shows to
 * Pro users or on the pricing page itself. State is best-effort localStorage.
 */
export function ProBanner({ trialAvailable }: { trialAvailable: boolean }) {
  const t = useT();
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const until = Number(localStorage.getItem(KEY) || 0);
      if (!until || Date.now() > until) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  if (!show || pathname?.startsWith("/pricing")) return null;

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(KEY, String(Date.now() + SNOOZE_DAYS * 86_400_000));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/25 bg-primary-soft px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
        <Sparkles className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink">
          {trialAvailable ? t("Try Pro free for 7 days") : t("Unlock PERSONA 90 Pro")}
        </p>
        <p className="text-xs text-muted">{t("A new episode every day, unlimited labs and AI coaching, the natural narrator and more.")}</p>
      </div>
      <Link
        href="/pricing"
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-bold text-white active:scale-[0.98]"
      >
        {trialAvailable ? t("Start free trial") : t("See Pro")}
      </Link>
      <button type="button" aria-label={t("Dismiss")} onClick={dismiss} className="rounded-lg p-1 text-muted hover:bg-surface">
        <X className="size-4" />
      </button>
    </div>
  );
}
