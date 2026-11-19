"use client";

import Link from "next/link";
import { Dumbbell, Gem, Leaf } from "lucide-react";
import { ButtonLink, Card } from "@/components/ui";
import type { EpisodeAllowance } from "@/lib/server/plan";
import { readStore } from "@/lib/client/app-context";
import { useEffect, useState } from "react";

/** Free plan, no episode today: the check-in kept the streak; offer the trial and free things to do. */
export function LiteDay({ allowance }: { allowance: EpisodeAllowance }) {
  const [storeApp, setStoreApp] = useState(false);
  useEffect(() => setStoreApp(Boolean(readStore())), []);
  const next = allowance.nextAt
    ? new Date(allowance.nextAt).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })
    : null;
  return (
    <Card className="overflow-hidden">
      <div className="bg-primary px-5 py-5 text-white sm:px-6">
        <p className="text-xs font-bold uppercase tracking-wider text-white/70">🌙 Aaj Lite day</p>
        <h2 className="mt-1 text-xl font-extrabold">Check-in ho gaya · streak safe ✓</h2>
        <p className="mt-1 text-sm text-white/80">
          Free plan mein hafte ke {allowance.limit} poore episode milte hain{next ? `. Agla free episode: ${next}` : ""}.
        </p>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-6">
        {(allowance.trialAvailable || !storeApp) && (
          <ButtonLink href="/pricing" className="sm:col-span-3">
            <Gem className="size-4" /> {allowance.trialAvailable ? "7 din Pro free try karo · aaj ka episode abhi" : "Pro lo · roz naya episode"}
          </ButtonLink>
        )}
        <Link href="/calm" className="flex items-center gap-3 rounded-2xl bg-bg p-3 transition hover:brightness-95">
          <Leaf className="size-5 text-accent" />
          <span className="text-sm font-semibold">Calm Corner</span>
        </Link>
        <Link href="/practice" className="flex items-center gap-3 rounded-2xl bg-bg p-3 transition hover:brightness-95">
          <Dumbbell className="size-5 text-coral" />
          <span className="text-sm font-semibold">Quick practice</span>
        </Link>
        <Link href="/journal" className="flex items-center gap-3 rounded-2xl bg-bg p-3 transition hover:brightness-95">
          <span className="text-lg">✍️</span>
          <span className="text-sm font-semibold">Journal</span>
        </Link>
      </div>
    </Card>
  );
}
