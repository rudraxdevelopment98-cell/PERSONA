"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Brain, Lock } from "lucide-react";
import { Button, Spinner } from "./ui";
import { useT } from "@/lib/i18n/client";
import { setLearningAction } from "@/app/(app)/learning-actions";

type Feature = "coach" | "journal";

const COPY: Record<Feature, { title: string; points: string[]; yes: string; no: string }> = {
  coach: {
    title: "Should your coach chats count towards your persona?",
    points: [
      "What you tell the coach becomes private tags and numbers (mood, stress, patterns). These shape your scores and future sessions.",
      "Your own words are deleted after 48 hours. Only the tags stay.",
    ],
    yes: "Yes, count it",
    no: "No, just chat",
  },
  journal: {
    title: "Let the app learn from your journal?",
    points: [
      "New entries become private tags and numbers (mood, stress, patterns) that shape your scores and future sessions.",
      "Your journal itself stays as it is. Only you can read it.",
    ],
    yes: "Yes, learn from it",
    no: "No, keep it private",
  },
};

/** One-time question before a sensitive source feeds the persona. Shown as a bottom sheet / dialog. */
export function LearningConsent({ feature, onClose }: { feature: Feature; onClose?: () => void }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [picked, setPicked] = useState<boolean | null>(null);
  const c = COPY[feature];
  const answer = (allowed: boolean) => {
    setPicked(allowed);
    start(async () => {
      await setLearningAction(feature, allowed);
      router.refresh();
      onClose?.();
    });
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/50 p-3 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label={t(c.title)}>
      <div className="w-full max-w-md rounded-3xl bg-surface p-5 shadow-raised motion-safe:animate-rise">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Brain className="size-5" />
        </span>
        <h2 className="mt-3 text-lg font-extrabold leading-snug">{t(c.title)}</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed">
          {c.points.map((p) => (
            <li key={p} className="flex gap-2">
              <Lock className="mt-1 size-3.5 shrink-0 text-accent" /> {t(p)}
            </li>
          ))}
          <li className="text-muted">{t("You can change this any time in My persona.")}</li>
        </ul>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" disabled={pending} onClick={() => answer(false)}>
            {pending && picked === false && <Spinner />} {t(c.no)}
          </Button>
          <Button disabled={pending} onClick={() => answer(true)}>
            {pending && picked === true && <Spinner />} {t(c.yes)}
          </Button>
        </div>
        <p className="mt-3 text-center text-xs text-muted">
          <Link href="/privacy#persona" className="underline underline-offset-2" target="_blank">{t("Full details in the Privacy Policy")}</Link>
        </p>
      </div>
    </div>
  );
}
