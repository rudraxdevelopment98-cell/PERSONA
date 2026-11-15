import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { AdvertiseForm } from "./advertise-form";

export const metadata: Metadata = { title: "Advertise", description: "Promote your book, podcast or course to people working on their confidence and communication." };

export default function AdvertisePage() {
  return (
    <div className="min-h-screen bg-bg">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/"><Logo /></Link>
        <Link href="/pricing" className="text-sm font-semibold text-primary">Pricing</Link>
      </header>
      <main className="mx-auto grid max-w-4xl gap-8 px-4 pb-16 sm:px-6 md:grid-cols-[1fr_380px]">
        <div className="space-y-4 py-4">
          <p className="text-xs font-bold uppercase tracking-wider text-accent">Advertise</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Reach people who are actively working on themselves</h1>
          <p className="text-muted">
            PERSONA 90 members spend 30 minutes a day building confidence, communication and decision-making. If your book, podcast, course or app genuinely helps
            with that, we can show it to them as a clearly labelled sponsored recommendation.
          </p>
          <ul className="space-y-2 text-sm">
            <li>✓ Shown on the home screen, after a finished session, or in the practice labs</li>
            <li>✓ Target by language: English, Hinglish or Hindi</li>
            <li>✓ You get views and clicks; we never share members&apos; personal data</li>
            <li>✓ Only Free-plan members see sponsored cards, and every card says &quot;Sponsored&quot;</li>
          </ul>
          <p className="text-sm text-muted">We review every request and only accept promotions that fit the programme. Tell us about yours and we&apos;ll get back to you by email.</p>
        </div>
        <AdvertiseForm />
      </main>
    </div>
  );
}
