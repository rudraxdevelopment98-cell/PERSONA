"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n/client";

/** Shown under a free-plan limit message. */
export function UpgradeHint({ show }: { show: boolean }) {
  const t = useT();
  if (!show) return null;
  return (
    <Link href="/pricing" className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
      <Sparkles className="size-4" />{" "}{t("See Pro - 7 days free")}</Link>
  );
}

/** "2 of 3 free this week" chip for limited features. */
export function UsageChip({ used, limit, period }: { used: number; limit: number; period: "week" | "day" }) {
  const t = useT();
  const left = Math.max(0, limit - used);
  return (
    <Link
      href="/pricing"
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${left === 0 ? "bg-warning-soft text-warning" : "bg-bg text-muted"}`}
      title={t("Free plan limit - Pro is unlimited")}
    >
      {t("{0} of {1}", left, limit)}{" "}{t("free left")}{" "}{period === "week" ? t("this week") : t("today")}
    </Link>
  );
}

export const isUpgradeError = (e: unknown) => Boolean(e && typeof e === "object" && (e as { upgrade?: boolean }).upgrade);
