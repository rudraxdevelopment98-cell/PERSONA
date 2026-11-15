import Link from "next/link";
import { Sparkles } from "lucide-react";

/** Shown under a free-plan limit message. */
export function UpgradeHint({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <Link href="/pricing" className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
      <Sparkles className="size-4" /> See Pro - 7 days free
    </Link>
  );
}

/** "2 of 3 free this week" chip for limited features. */
export function UsageChip({ used, limit, period }: { used: number; limit: number; period: "week" | "day" }) {
  const left = Math.max(0, limit - used);
  return (
    <Link
      href="/pricing"
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${left === 0 ? "bg-warning-soft text-warning" : "bg-bg text-muted"}`}
      title="Free plan limit - Pro is unlimited"
    >
      {left} of {limit} free left {period === "week" ? "this week" : "today"}
    </Link>
  );
}

export const isUpgradeError = (e: unknown) => Boolean(e && typeof e === "object" && (e as { upgrade?: boolean }).upgrade);
