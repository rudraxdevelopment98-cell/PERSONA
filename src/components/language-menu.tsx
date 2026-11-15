"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Languages } from "lucide-react";
import { setLanguage } from "@/app/(app)/settings/actions";
import type { Language } from "@/lib/ai/prompts";
import { Spinner, cx } from "./ui";

const OPTIONS: { id: Language; label: string; short: string; hint: string }[] = [
  { id: "en", label: "English", short: "EN", hint: "Stories, feedback and coach in English" },
  { id: "hinglish", label: "Hinglish", short: "Hing", hint: "Roman Hindi + English mix" },
  { id: "hi", label: "हिन्दी", short: "हिं", hint: "देवनागरी में हिंदी" },
];

const NOTE: Record<Language, string> = {
  en: "Changes the language of AI content: check-ins, stories, scenarios, feedback, coach and the assessment.",
  hinglish: "AI content ki bhasha badalta hai: check-in, story, scenarios, feedback, coach aur assessment.",
  hi: "AI सामग्री की भाषा बदलता है: चेक-इन, कहानी, परिदृश्य, फ़ीडबैक, कोच और आकलन।",
};

const SAVED: Record<Language, string> = {
  en: "Language set to English",
  hinglish: "Language Hinglish ho gayi",
  hi: "भाषा हिन्दी कर दी गई",
};

/** Compact header menu to switch the AI content language at any time. */
export function LanguageMenu({ value, align = "right" }: { value: Language; align?: "left" | "right" }) {
  const router = useRouter();
  const [lang, setLang] = useState<Language>(value);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setLang(value), [value]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const choose = (l: Language) => {
    setOpen(false);
    if (l === lang) return;
    const prev = lang;
    setLang(l);
    setError(null);
    start(async () => {
      const res = await setLanguage(l);
      if (res.error) {
        setLang(prev);
        setError(res.error);
        return;
      }
      setToast(SAVED[l]);
      router.refresh();
    });
  };

  const current = OPTIONS.find((o) => o.id === lang) ?? OPTIONS[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Language: ${current.label}. Change language`}
        className="inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-line bg-surface px-2 text-xs font-bold text-ink transition hover:bg-bg sm:gap-1.5 sm:px-2.5"
      >
        {pending ? <Spinner className="size-3.5" /> : <Languages className="size-3.5 text-primary" />}
        {current.short}
        <ChevronDown className={cx("hidden size-3.5 text-muted transition-transform sm:block", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="menu"
          className={cx(
            "fixed inset-x-3 top-16 z-50 rounded-2xl border border-line bg-surface p-1.5 shadow-raised sm:absolute sm:inset-x-auto sm:top-10 sm:w-64",
            align === "right" ? "sm:right-0" : "sm:left-0",
          )}
        >
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              role="menuitemradio"
              aria-checked={lang === o.id}
              onClick={() => choose(o.id)}
              className={cx("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-bg", lang === o.id && "bg-primary-soft")}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{o.label}</span>
                <span className="block text-xs text-muted">{o.hint}</span>
              </span>
              {lang === o.id && <Check className="size-4 shrink-0 text-primary" />}
            </button>
          ))}
          <p className="border-t border-line px-3 pb-1.5 pt-2 text-[11px] leading-relaxed text-muted">{NOTE[lang]}</p>
        </div>
      )}

      {(toast || error) && (
        <div
          role="status"
          className={cx(
            "fixed left-1/2 top-16 z-50 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold shadow-raised sm:absolute sm:left-auto sm:top-10 sm:translate-x-0",
            align === "right" ? "sm:right-0" : "sm:left-0",
            error ? "bg-danger-soft text-danger" : "bg-primary text-white",
          )}
        >
          {error ?? toast}
        </div>
      )}
    </div>
  );
}
