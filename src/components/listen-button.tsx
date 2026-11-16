"use client";

import { Headphones, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cx } from "./ui";

const RATES = [1, 1.25, 0.85];

/** Picks a voice that suits the text: Hindi for Devanagari, Indian English for Hinglish/English. */
function pickVoice(text: string): { lang: string; voice: SpeechSynthesisVoice | null } {
  const voices = window.speechSynthesis.getVoices();
  const hindi = /[ऀ-ॿ]/.test(text);
  const prefs = hindi ? ["hi-IN", "hi"] : ["en-IN", "en-GB", "en-US", "en"];
  for (const p of prefs) {
    const v = voices.find((x) => x.lang.replace("_", "-").toLowerCase().startsWith(p.toLowerCase()));
    if (v) return { lang: v.lang, voice: v };
  }
  return { lang: hindi ? "hi-IN" : "en-IN", voice: null };
}

/**
 * Reads the story aloud with the device's built-in voice (free, works offline on most phones).
 * Speaks one paragraph at a time, reports which one is playing, and calls onEnd after the last.
 */
export function ListenButton({ paragraphs, onParagraph, onEnd }: { paragraphs: string[]; onParagraph?: (i: number | null) => void; onEnd?: () => void }) {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<"idle" | "playing" | "paused">("idle");
  const [rate, setRate] = useState(1);
  const index = useRef(0);
  const run = useRef(0);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
    return () => {
      run.current++;
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const speakFrom = (i: number, r = rate) => {
    const synth = window.speechSynthesis;
    const myRun = ++run.current;
    synth.cancel();
    const next = (k: number) => {
      if (myRun !== run.current) return;
      if (k >= paragraphs.length) {
        setState("idle");
        index.current = 0;
        onParagraph?.(null);
        onEnd?.();
        return;
      }
      index.current = k;
      onParagraph?.(k);
      const u = new SpeechSynthesisUtterance(paragraphs[k]);
      const { lang, voice } = pickVoice(paragraphs[k]);
      u.lang = lang;
      if (voice) u.voice = voice;
      u.rate = r;
      u.onend = () => next(k + 1);
      u.onerror = (e) => {
        if (e.error !== "interrupted" && e.error !== "canceled") next(k + 1);
      };
      synth.speak(u);
    };
    setState("playing");
    next(i);
  };

  const toggle = () => {
    const synth = window.speechSynthesis;
    if (state === "playing") {
      synth.pause();
      setState("paused");
    } else if (state === "paused") {
      synth.resume();
      setState("playing");
      // Some browsers drop a long pause; restart the current paragraph if nothing is speaking.
      setTimeout(() => {
        if (!synth.speaking) speakFrom(index.current);
      }, 300);
    } else {
      speakFrom(0);
    }
  };

  const cycleRate = () => {
    const r = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    setRate(r);
    if (state === "playing") speakFrom(index.current, r);
  };

  if (!supported) return null;
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={toggle}
        aria-label={state === "playing" ? "Pause listening" : state === "paused" ? "Resume listening" : "Listen to the story"}
        className={cx(
          "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition active:scale-95",
          state === "idle" ? "bg-primary-soft text-primary" : "bg-primary text-white",
        )}
      >
        {state === "playing" ? <Pause className="size-3.5" /> : state === "paused" ? <Play className="size-3.5" /> : <Headphones className="size-3.5" />}
        {state === "idle" ? "Listen" : state === "playing" ? "Pause" : "Play"}
      </button>
      {state !== "idle" && (
        <button type="button" onClick={cycleRate} aria-label={`Speed ${rate}x`} className="h-8 rounded-full px-2 text-xs font-bold tabular-nums text-muted hover:bg-bg">
          {rate}x
        </button>
      )}
    </div>
  );
}
