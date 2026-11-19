import Link from "next/link";
import { cookies, headers } from "next/headers";
import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { getSessionUser } from "@/lib/db/server";
import { DISPLAY_PRICES, DISPLAY_PRICES_INR, FEATURES, FREE_LIMITS, TRIAL_DAYS } from "@/lib/domain/plans";
import { getPlan } from "@/lib/server/plan";
import { publicConfig } from "@/lib/server/payments";
import { PricingClient } from "./pricing-client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pricing", description: "PERSONA 90 is free. Pro adds unlimited practice." };

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const [user, config, sp] = await Promise.all([getSessionUser(), publicConfig(), searchParams]);
  const plan = user ? await getPlan(user.id) : null;
  // Visitors in India see rupee prices until Paddle's own localised price loads.
  const india = (await headers()).get("x-vercel-ip-country") === "IN";
  const storeApp = (await cookies()).get("p90_store")?.value === "play";
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
            Your daily check-in and streak are always free, with a full episode every day in week 1 and {FREE_LIMITS.episodesPerWeek} a week after that. Pro gives you a new
            episode every day and removes every limit. Try it free for {TRIAL_DAYS} days - no card needed.
          </p>
        </div>
        <PricingClient
          signedIn={Boolean(user)}
          email={user?.email ?? null}
          userId={user?.id ?? null}
          plan={plan}
          config={config}
          prices={india ? DISPLAY_PRICES_INR : DISPLAY_PRICES}
          currency={india ? "₹" : "$"}
          storeApp={storeApp}
          features={FEATURES}
          justPaid={sp.checkout === "success"}
        />
        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-muted">
          Have a book, podcast or course that helps people grow? <Link href="/advertise" className="font-semibold text-primary hover:underline">Advertise with us</Link>
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-center text-xs text-muted">
          Payments are processed by Paddle, our reseller and Merchant of Record, in your local currency with taxes included where they apply. Cancel any time - Pro stays active until the end of the period you paid for.
        </p>
      </main>
    </div>
  );
}
