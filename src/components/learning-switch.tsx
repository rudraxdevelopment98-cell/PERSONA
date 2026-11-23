"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Brain } from "lucide-react";
import { cx } from "./ui";
import { LearningConsent } from "./learning-consent";
import { setLearningAction } from "@/app/(app)/learning-actions";
import { useT } from "@/lib/i18n/client";

/** Small switch: may the app learn from this source? Turning it on always asks first. */
export function LearningSwitch({ feature, on, label }: { feature: "coach" | "journal"; on: boolean | null; label?: string }) {
  const t = useT();
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => (on ? start(async () => void (await setLearningAction(feature, false), router.refresh())) : setAsk(true))}
        className={cx("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold", on ? "border-accent bg-accent-soft text-accent" : "border-line text-muted")}
        aria-pressed={Boolean(on)}
      >
        <Brain className="size-3.5" /> {label ? `${t(label)}: ` : ""}{on ? t("App learns from it: On") : t("App learns from it: Off")}
      </button>
      {ask && <LearningConsent feature={feature} onClose={() => setAsk(false)} />}
    </>
  );
}
