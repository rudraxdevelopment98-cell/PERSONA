import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { getSessionUser } from "@/lib/db/server";
import { DISPLAY_PRICES, FEATURES, TRIAL_DAYS } from "@/lib/domain/plans";
import { getPlan } from "@/lib/server/plan";
import { publicConfig } from "@/lib/server/payments";
import { PricingClient } from "./pricing-client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pricing", description: "PERSONA 90 is free. Pro adds unlimited practice." };

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const [user, config, sp] = await Promise.all([getSessionUser(), publicConfig(), searchParams]);
  const plan = user ? await getPlan(user.id) : null;
  return (
    <div className="min-h-screen bg-bg">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href={user ? "/dashboard" : "/"}>
          <Logo />
        </Link>
        <Link href={user ? "/dashboard" : "/login"} className="text-sm font-semibold text-primary">
          {user ? "Back to app" : "Sign in"}
        </Link>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-2xl py-6 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-accent">Pricing</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Start free. Go Pro when you want more practice.</h1>
          <p className="mt-3 text-muted">
            The full 90-day programme is free, every day. Pro removes the limits on the labs and your AI coach. Try it free for {TRIAL_DAYS} days - no card needed.
          </p>
        </div>
        <PricingClient
          signedIn={Boolean(user)}
          email={user?.email ?? null}
          userId={user?.id ?? null}
          plan={plan}
          config={config}
          prices={DISPLAY_PRICES}
          features={FEATURES}
          justPaid={sp.checkout === "success"}
        />
        <p className="mx-auto mt-10 max-w-2xl text-center text-xs text-muted">
          Payments are processed by Paddle, our reseller and Merchant of Record, in your local currency with taxes included where they apply. Cancel any time - Pro stays active until the end of the period you paid for.
        </p>
      </main>
    </div>
  );
}
