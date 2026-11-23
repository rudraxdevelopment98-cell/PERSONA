"use client";

import { useT } from "@/lib/i18n/client";
export function Logo({ className = "" }: { className?: string }) {
  const t = useT();
  return (
    <span className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap ${className}`}>
      <span className="relative flex size-8 items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-white">{t("P")}<span className="absolute bottom-1.5 right-1.5 size-1.5 rounded-full bg-accent" />
      </span>
      <span className="text-[15px] font-extrabold tracking-tight text-ink">{t("PERSONA")}{" "}<span className="text-accent">90</span>
      </span>
    </span>
  );
}
