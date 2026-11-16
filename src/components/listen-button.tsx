"use client";

import Link from "next/link";
import { Headphones, Pause, Play, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cx } from "./ui";

const RATES = [1, 1.25, 0.85];
const CACHE = "p90-voice-v1";

export type AIVoice = {
  sessionId: string;
  /** May use the AI narrator for this story. */
  allowed: boolean;
  pro: boolean;
  remaining: number;
};

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

/** One narrated part as a playable URL; kept in the browser cache so replays cost nothing. */
async function aiPart(sessionId: string, part: number): Promise<string> {
  const url = `/api/story/audio?session=${sessionId}&part=${part}`;
  let res: Response | undefined;
  let cache: Cache | null = null;
  try {
    cache = await caches.open(CACHE);
    res = await cache.match(url);
  } catch {}
  if (!res) {
    res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    if (cache) await cache.put(url, res.clone()).catch(() => {});
  }
  return URL.createObjectURL(await res.blob());
}

/**
 * Reads the story aloud. Pro (and a monthly free taste) get the AI narrator;
 * everyone else, or when it is unavailable, gets the device's built-in voice.
 * Reports the paragraph being read and calls onEnd after the last one.
 */
export function ListenButton({
  paragraphs,
  onParagraph,
  onEnd,
  ai,
}: {
  paragraphs: string[];
  onParagraph?: (i: number | null) => void;
  onEnd?: () => void;
  ai?: AIVoice | null;
}) {
  const [deviceOk, setDeviceOk] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "playing" | "paused">("idle");
  const [rate, setRate] = useState(1);
  const [useAI, setUseAI] = useState(Boolean(ai?.allowed));
  const [note, setNote] = useState<string | null>(null);
  const index = useRef(0);
  const run = useRef(0);
  const engine = useRef<"ai" | "device">("device");
  const audio = useRef<HTMLAudioElement | null>(null);
  const urls = useRef(new Map<number, Promise<string>>());

  useEffect(() => {
    setDeviceOk(typeof window !== "undefined" && "speechSynthesis" in window);
    if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
    const map = urls.current;
    return () => {
      run.current++;
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      audio.current?.pause();
      map.forEach((p) => p.then((u) => URL.revokeObjectURL(u)).catch(() => {}));
    };
  }, []);

  const finish = () => {
    setState("idle");
    index.current = 0;
    onParagraph?.(null);
    onEnd?.();
  };

  const speakDevice = (i: number, r = rate) => {
    const synth = window.speechSynthesis;
    const myRun = ++run.current;
    engine.current = "device";
    audio.current?.pause();
    synth.cancel();
    const next = (k: number) => {
      if (myRun !== run.current) return;
      if (k >= paragraphs.length) return finish();
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

  const fetchPart = (k: number) => {
    if (!ai) return Promise.reject(new Error("no ai"));
    let p = urls.current.get(k);
    if (!p) {
      p = aiPart(ai.sessionId, k);
      urls.current.set(k, p);
      p.catch(() => urls.current.delete(k));
    }
    return p;
  };

  const playAI = (i: number, r = rate) => {
    const myRun = ++run.current;
    engine.current = "ai";
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    const el = (audio.current ??= new Audio());
    const next = async (k: number) => {
      if (myRun !== run.current) return;
      if (k >= paragraphs.length) return finish();
      index.current = k;
      onParagraph?.(k);
      try {
        if (!urls.current.has(k)) setState("loading");
        const src = await fetchPart(k);
        if (myRun !== run.current) return;
        if (k + 1 < paragraphs.length) fetchPart(k + 1).catch(() => {});
        el.src = src;
        el.playbackRate = r;
        el.onended = () => next(k + 1);
        await el.play();
        setState("playing");
      } catch (e) {
        if (myRun !== run.current) return;
        // Limit reached, AI busy or autoplay blocked: carry on with the device voice.
        setNote((e as Error).message === "402" ? "AI voice limit reached · device voice" : "Device voice");
        setUseAI(false);
        if (deviceOk) speakDevice(k, r);
        else setState("idle");
      }
    };
    setState("loading");
    void next(i);
  };

  const start = (i: number, r = rate) => (useAI && ai?.allowed ? playAI(i, r) : speakDevice(i, r));

  const toggle = () => {
    if (state === "playing") {
      if (engine.current === "ai") audio.current?.pause();
      else window.speechSynthesis.pause();
      setState("paused");
    } else if (state === "paused") {
      setState("playing");
      if (engine.current === "ai") {
        audio.current?.play().catch(() => start(index.current));
      } else {
        const synth = window.speechSynthesis;
        synth.resume();
        // Some browsers drop a long pause; restart the current paragraph if nothing is speaking.
        setTimeout(() => {
          if (!synth.speaking) speakDevice(index.current);
        }, 300);
      }
    } else if (state === "idle") {
      start(0);
    }
  };

  const cycleRate = () => {
    const r = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    setRate(r);
    if (engine.current === "ai" && audio.current) audio.current.playbackRate = r;
    else if (state === "playing") speakDevice(index.current, r);
  };

  const switchEngine = () => {
    const next = !useAI;
    setUseAI(next);
    setNote(null);
    if (state === "playing" || state === "paused" || state === "loading") {
      if (next && ai?.allowed) playAI(index.current);
      else speakDevice(index.current);
    }
  };

  if (!deviceOk && !ai?.allowed) return null;
  const aiOn = useAI && Boolean(ai?.allowed);
  return (
    <div className="flex shrink-0 items-center gap-1">
      {ai && (ai.allowed ? (
        <button
          type="button"
          onClick={switchEngine}
          aria-pressed={aiOn}
          aria-label={aiOn ? "AI voice on. Switch to device voice" : "Switch to AI voice"}
          title={note ?? (aiOn ? `AI voice${ai.pro ? "" : ` · ${ai.remaining} free left this month`}` : "Device voice")}
          className={cx("rounded-full p-1.5 transition", aiOn ? "bg-sun-soft text-warning" : "text-muted hover:bg-bg")}
        >
          <Sparkles className="size-4" />
        </button>
      ) : (
        <Link href="/pricing" title={ai.pro ? "AI voice limit reached this month" : "AI narrator voice · Pro"} aria-label="AI narrator voice is a Pro feature" className="rounded-full p-1.5 text-muted/60 hover:text-warning">
          <Sparkles className="size-4" />
        </Link>
      ))}
      <button
        type="button"
        onClick={toggle}
        disabled={state === "loading"}
        aria-label={state === "playing" ? "Pause listening" : state === "paused" ? "Resume listening" : state === "loading" ? "Preparing audio" : "Listen to the story"}
        className={cx(
          "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition active:scale-95 disabled:opacity-70",
          state === "idle" ? "bg-primary-soft text-primary" : "bg-primary text-white",
        )}
      >
        {state === "loading" ? (
          <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />
        ) : state === "playing" ? (
          <Pause className="size-3.5" />
        ) : state === "paused" ? (
          <Play className="size-3.5" />
        ) : (
          <Headphones className="size-3.5" />
        )}
        {state === "idle" ? "Listen" : state === "playing" ? "Pause" : state === "loading" ? "…" : "Play"}
      </button>
      {state !== "idle" && (
        <button type="button" onClick={cycleRate} aria-label={`Speed ${rate}x`} className="h-8 rounded-full px-2 text-xs font-bold tabular-nums text-muted hover:bg-bg">
          {rate}x
        </button>
      )}
    </div>
  );
}
