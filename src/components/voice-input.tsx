"use client";

import { createContext, useContext, useEffect, useRef, useState, type ChangeEvent, type ComponentProps, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, Mic, X } from "lucide-react";
import { useVoiceInput } from "@/lib/client/use-voice-input";
import type { Language } from "@/lib/domain/languages";
import { Textarea, cx } from "./ui";

const VoiceLang = createContext<Language>("en");
export function VoiceLangProvider({ lang, children }: { lang: Language; children: ReactNode }) {
  return <VoiceLang.Provider value={lang}>{children}</VoiceLang.Provider>;
}
export const useVoiceLang = () => useContext(VoiceLang);

const T: Record<Language, { listening: string; thinking: string; hint: string; done: string; cancel: string; mic: string }> = {
  en: { listening: "Listening…", thinking: "Writing it down…", hint: "Speak freely. Tap ✓ when you're done.", done: "Done", cancel: "Cancel", mic: "Speak instead of typing" },
  hinglish: { listening: "Sun raha hoon…", thinking: "Likh raha hoon…", hint: "Khul ke bolo. Ho jaye toh ✓ dabao.", done: "Ho gaya", cancel: "Cancel", mic: "Type nahi, bol ke likho" },
  hi: { listening: "सुन रहा हूँ…", thinking: "लिख रहा हूँ…", hint: "खुलकर बोलिए। हो जाए तो ✓ दबाइए।", done: "हो गया", cancel: "रद्द करें", mic: "टाइप नहीं, बोलकर लिखें" },
  gu: { listening: "સાંભળું છું…", thinking: "લખી રહ્યો છું…", hint: "ખુલીને બોલો. થઈ જાય એટલે ✓ દબાવો.", done: "થઈ ગયું", cancel: "રદ કરો", mic: "ટાઇપ નહીં, બોલીને લખો" },
};

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Full-screen listening sheet with a Siri-style orb that moves with the voice. */
function VoiceSheet({ lang, onText, onClose }: { lang: Language; onText: (t: string) => void; onClose: () => void }) {
  const t = T[lang];
  const orb = useRef<HTMLDivElement>(null);
  const wave = useRef<HTMLDivElement>(null);
  const v = useVoiceInput(lang, (lvl, bars) => {
    orb.current?.style.setProperty("--lvl", lvl.toFixed(3));
    wave.current?.querySelectorAll("b").forEach((b, i) => b.style.setProperty("--h", (bars[i] ?? lvl * 0.6).toFixed(3)));
  });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    v.start().then((text) => {
      if (text) {
        onText(text);
        onClose();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        v.cancel();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [v, onClose]);

  const close = () => {
    v.cancel();
    onClose();
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={t.mic} className="fixed inset-0 z-[80] flex flex-col items-center justify-end bg-[#0b1422]/80 backdrop-blur-md sm:justify-center">
      <div className="animate-rise w-full max-w-md rounded-t-[32px] bg-gradient-to-b from-[#13213a] to-[#0b1422] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 text-white shadow-raised sm:rounded-[32px]">
        <div className="flex items-center justify-between text-xs text-white/60">
          <span>{v.phase === "listening" ? clock(v.seconds) : " "}</span>
          <button type="button" onClick={close} aria-label={t.cancel} className="flex size-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex flex-col items-center gap-5 py-4">
          <div ref={orb} className="voice-orb" data-state={v.phase === "thinking" ? "thinking" : "listening"} aria-hidden>
            <span />
            <span />
            <span />
            <i />
          </div>
          <p className={cx("text-lg font-semibold", v.phase === "thinking" && "think-shimmer")} aria-live="polite">
            {v.phase === "thinking" ? t.thinking : v.phase === "error" ? "😕" : t.listening}
          </p>
          {v.phase === "listening" && (
            <div ref={wave} className="voice-wave" aria-hidden>
              {Array.from({ length: 7 }, (_, i) => (
                <b key={i} />
              ))}
            </div>
          )}
          <p className="min-h-10 max-w-sm text-center text-sm leading-relaxed text-white/75">
            {v.phase === "error" ? v.error : v.live || (v.phase === "listening" ? t.hint : "")}
          </p>
        </div>
        <div className="flex items-center justify-center gap-4 pb-2">
          {v.phase === "listening" && (
            <button
              type="button"
              onClick={v.finish}
              className="flex h-14 items-center gap-2 rounded-full bg-white px-7 text-base font-bold text-[#13213a] shadow-raised transition active:scale-95"
            >
              <Check className="size-5" strokeWidth={3} /> {t.done}
            </button>
          )}
          {v.phase === "error" && (
            <button type="button" onClick={close} className="h-12 rounded-full bg-white/15 px-6 text-sm font-semibold">
              {t.cancel}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** A round mic button; opens the listening sheet and hands back the text. */
export function MicButton({ onText, className, lang: own }: { onText: (text: string) => void; className?: string; lang?: Language }) {
  const ctxLang = useVoiceLang();
  const lang = own ?? ctxLang;
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={T[lang].mic}
        title={T[lang].mic}
        className={cx(
          "flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-card transition hover:brightness-110 active:scale-95",
          className,
        )}
      >
        <Mic className="size-[18px]" />
      </button>
      {open && <VoiceSheet lang={lang} onText={onText} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Adds spoken text to what's already written. */
export function appendSpoken(current: string, spoken: string, max?: number): string {
  const base = current.trimEnd();
  const next = base ? `${base}${/[.!?।]$/.test(base) ? " " : base.endsWith(",") ? " " : ". "}${spoken}` : spoken;
  return max ? next.slice(0, max) : next;
}

/** A textarea with a mic: speak instead of typing. Same props as Textarea. */
export function VoiceTextarea({ className, onChange, value, maxLength, ...props }: ComponentProps<"textarea">) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const add = (text: string) => {
    const next = appendSpoken(String(value ?? ""), text, maxLength);
    onChange?.({ target: { value: next }, currentTarget: { value: next } } as unknown as ChangeEvent<HTMLTextAreaElement>);
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(next.length, next.length);
    });
  };
  return (
    <div className="relative">
      <Textarea ref={ref} value={value} onChange={onChange} maxLength={maxLength} className={cx("pb-14", className)} {...props} />
      <MicButton onText={add} className="absolute bottom-2.5 right-2.5" />
    </div>
  );
}
