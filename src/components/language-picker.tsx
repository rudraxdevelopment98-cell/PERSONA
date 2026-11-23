"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Languages } from "lucide-react";
import { setLanguage } from "@/app/(app)/settings/actions";
import { LANGUAGE_LABELS, type Language } from "@/lib/ai/prompts";
import { languageInfo } from "@/lib/domain/languages";
import { cx } from "./ui";

/** Segmented language switch: changes the language of all AI-generated content. */
export function LanguagePicker({ value }: { value: Language }) {
  const router = useRouter();
  const [lang, setLang] = useState(value);
  const [pending, start] = useTransition();
  // Stay in sync when the language is changed elsewhere (e.g. the header menu).
  useEffect(() => setLang(value), [value]);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Languages className="size-4 text-muted" />
      <span className="text-sm text-muted">AI content language:</span>
      <div className="flex flex-wrap gap-1 rounded-2xl bg-primary-soft p-1">
        {(Object.keys(LANGUAGE_LABELS) as Language[]).map((l) => (
          <button
            key={l}
            type="button"
            disabled={pending}
            onClick={() => {
              setLang(l);
              start(async () => {
                await setLanguage(l);
                router.refresh();
              });
            }}
            aria-pressed={lang === l}
            className={cx(
              "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
              lang === l ? "bg-surface text-primary shadow-card" : "text-muted hover:text-ink",
            )}
          >
            {languageInfo(l).label}
          </button>
        ))}
      </div>
    </div>
  );
}
