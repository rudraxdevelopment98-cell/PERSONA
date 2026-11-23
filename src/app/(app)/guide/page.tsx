import Link from "next/link";
import { BookOpen, Brain, Flame, Lock, MessageCircle, NotebookPen, Target } from "lucide-react";
import type { ReactNode } from "react";
import { Card, PageHeader } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { OpenHash } from "./open-hash";

export const metadata = { title: "Guide" };

/**
 * Every "how does this work?" explanation lives here instead of on the working screens,
 * so the workspace stays light. Screens link here with a small "How it works" link.
 */
const SECTIONS: { id: string; icon: ReactNode; title: string; points: string[] }[] = [
  {
    id: "day",
    icon: <BookOpen className="size-5" />,
    title: "Your daily practice",
    points: [
      "Each day: a quick check-in, then a short story, 3 situations to answer, one small real-life challenge and a reflection.",
      "Busy day? The check-in alone keeps your streak.",
      "You can stop any time. The app remembers where you were.",
    ],
  },
  {
    id: "scores",
    icon: <Target className="size-5" />,
    title: "How your scores work",
    points: [
      "Each of the 10 skills has a score from 0 to 100. Your starting score comes from the first assessment.",
      "It mixes how you rate yourself in check-ins with how you actually answer situations and labs. Real answers count more once there is enough of them.",
      "For self-discipline, showing up regularly also counts.",
      "Each answer gets a score out of 100: understanding the situation, reasoning, thinking for yourself and being practical (25 each). Tap \"See full feedback\" for an example answer and the psychology behind it.",
      "These are growth indicators, not a medical test.",
    ],
  },
  {
    id: "persona",
    icon: <Brain className="size-5" />,
    title: "How your persona works",
    points: [
      "What you write in check-ins, reflections and labs becomes private tags: feelings, situations, thinking patterns and stress / confidence levels.",
      "No names, places or quotes are kept. Your own words are deleted after 48 hours.",
      "Older entries count less, so your persona follows how you are now.",
      "See it or delete it any time in Me → My persona.",
    ],
  },
  {
    id: "coach",
    icon: <MessageCircle className="size-5" />,
    title: "AI coach",
    points: [
      "The coach gives practical guidance based on your scores and practice. It is not a therapist and does not diagnose.",
      "Chats count towards your persona only if you said yes. The words are deleted after 48 hours either way.",
      "The coach can read your 5 latest journal entries only if you allow it in Settings.",
    ],
  },
  {
    id: "journal",
    icon: <NotebookPen className="size-5" />,
    title: "Journal",
    points: [
      "Your diary. Only you can read it, and the app never deletes it.",
      "It shapes your persona only if you switch on \"App learns from it\". Switching it off removes what was learned.",
    ],
  },
  {
    id: "streaks",
    icon: <Flame className="size-5" />,
    title: "XP, levels and streaks",
    points: [
      "Every finished step gives XP. XP fills your level.",
      "Your streak counts the days in a row you practise.",
      "Badges unlock for milestones. Friends only see what you choose to share.",
    ],
  },
];

export default async function GuidePage() {
  const t = await getT();
  return (
    <>
      <OpenHash />
      <PageHeader title={t("Guide")} description={t("How everything works, in one place.")} />
      <div className="space-y-3">
        {SECTIONS.map((s, i) => (
          <Card key={s.id} className="overflow-hidden">
            <details id={s.id} open={i === 0} className="group scroll-mt-24">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">{s.icon}</span>
                <span className="flex-1 font-semibold">{t(s.title)}</span>
                <span className="text-muted transition-transform group-open:rotate-90">›</span>
              </summary>
              <ul className="space-y-2 px-5 pb-5 text-[15px] leading-relaxed">
                {s.points.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent" />
                    {t(p)}
                  </li>
                ))}
              </ul>
            </details>
          </Card>
        ))}
        <p className="flex items-center justify-center gap-1.5 pt-2 text-sm text-muted">
          <Lock className="size-4" />
          <Link href="/privacy" className="underline underline-offset-2">{t("Privacy Policy")}</Link> ·{" "}
          <Link href="/terms" className="underline underline-offset-2">{t("Terms")}</Link>
        </p>
      </div>
    </>
  );
}
