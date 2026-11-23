"use client";

import Link from "next/link";
import { BookOpen, ExternalLink, GraduationCap, Headphones, Megaphone, Smartphone, Ticket } from "lucide-react";
import type { SponsorCardData } from "@/lib/server/sponsors";
import { useT } from "@/lib/i18n/client";

const ICONS = { book: BookOpen, podcast: Headphones, course: GraduationCap, app: Smartphone, event: Ticket, other: Megaphone } as const;

/** A clearly labelled sponsored recommendation (Free plan only). */
export function SponsorCard({ s }: { s: SponsorCardData }) {
  const t = useT();
  const Icon = ICONS[s.category as keyof typeof ICONS] ?? Megaphone;
  return (
    <aside className="flex items-start gap-3 rounded-2xl border border-dashed border-line bg-surface p-4" aria-label={t("Sponsored")}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sun-soft text-warning">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{t("Sponsored · {0}", s.sponsor)}</p>
        <p className="mt-0.5 font-bold">{t(s.title)}</p>
        <p className="text-sm text-muted">{s.body}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <a
            href={`/api/sponsor/click?c=${s.id}&p=${s.placement}`}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            {t(s.cta)} <ExternalLink className="size-3.5" />
          </a>
          <Link href="/pricing" className="text-xs text-muted hover:underline">{t("Remove ads with Pro")}</Link>
        </div>
      </div>
    </aside>
  );
}
