"use client";

import Link from "next/link";
import { Check, Download, Headphones, Pause, Play, Settings2, Sparkles, Volume2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GOOD_VOICE, bestVoice, langOf, rankedVoices, saveVoiceName, savedVoiceName, sentences, voiceScore, voiceTip, type VoiceLang } from "@/lib/client/voices";
import { PIPER_VOICES, delivery, isDownloaded, loadVoice, piperSupported, piperVoice, speechSentences, synthesize, synthesizeScript, type PiperVoiceId } from "@/lib/client/piper";
import { perform, type ScriptSentence } from "@/lib/domain/emotion";
import { cx } from "./ui";
import { useT } from "@/lib/i18n/client";

const RATES = [1, 1.25, 0.85];
const CACHE = "p90-voice-v1";
const PREF = "p90-listen-engine";

export type AIVoice = {
  sessionId: string;
  /** May use the AI narrator for this story. */
  allowed: boolean;
  pro: boolean;
  remaining: number;
};

type Engine = "ai" | "piper" | "device";

const readPref = (): string | null => {
  try {
    return localStorage.getItem(PREF);
  } catch {
    return null;
  }
};
const writePref = (v: string) => {
  try {
    localStorage.setItem(PREF, v);
  } catch {}
};

const VOICE_HELLO: Record<VoiceLang, string> = {
  en: "Namaste! I will read today's story for you.",
  hi: "नमस्ते! मैं आज की कहानी सुनाऊँगी।",
  mr: "नमस्कार! मी आजची गोष्ट वाचून दाखवते.",
  gu: "નમસ્તે! હું આજની વાર્તા સંભળાવીશ.",
  bn: "নমস্কার! আমি আজকের গল্পটা পড়ে শোনাব।",
  ta: "வணக்கம்! இன்றைய கதையை நான் படித்துக் காட்டுகிறேன்.",
  te: "నమస్తే! ఈరోజు కథ నేను చదివి వినిపిస్తాను.",
  kn: "ನಮಸ್ಕಾರ! ಇವತ್ತಿನ ಕಥೆಯನ್ನು ನಾನು ಓದಿ ಹೇಳುತ್ತೇನೆ.",
};

/** The story's language from its script: Indian scripts map to their voice, Roman Hindi is "hinglish", else "en". */
function storyLanguage(text: string): VoiceLang | "hinglish" {
  const script = langOf(text);
  if (script !== "en") return script;
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  const hind = words.filter((w) => /^(hai|hain|nahi|kya|mein|tum|aur|ki|ka|ke|ko|se|ne|bhi|toh|tha|thi|kar|raha|rahi|apni|apna|uska|uski)$/.test(w)).length;
  return words.length && hind / words.length > 0.06 ? "hinglish" : "en";
}

/** One AI-narrated part as a playable URL; kept in the browser cache so replays cost nothing. */
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
 * Reads the story aloud with one of three engines:
 * - AI narrator (Pro, and a monthly free taste),
 * - HD voice: free neural Piper voices running on the device after a one-time download,
 * - the best voice the phone already has.
 * Reports the paragraph being read and calls onEnd after the last one.
 */
export function ListenButton({
  paragraphs,
  onParagraph,
  onEnd,
  ai,
  sessionId,
}: {
  paragraphs: string[];
  onParagraph?: (i: number | null) => void;
  onEnd?: () => void;
  ai?: AIVoice | null;
  /** Lets Hinglish stories fetch a Devanagari listening script for Hindi voices. */
  sessionId?: string;
}) {
  const t = useT();
  const [deviceOk, setDeviceOk] = useState(false);
  // Checked after mount: the server can't know, and the first render must match it.
  const [piperOk, setPiperOk] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "playing" | "paused">("idle");
  const [rate, setRate] = useState(1);
  const [engineChoice, setEngineChoice] = useState<Engine>("device");
  const [piperId, setPiperId] = useState<PiperVoiceId | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const index = useRef(0);
  const run = useRef(0);
  const engine = useRef<Engine>("device");
  const audio = useRef<HTMLAudioElement | null>(null);
  const urls = useRef(new Map<string, Promise<string>>());
  const lang = storyLanguage(paragraphs.join(" ").slice(0, 3000));
  // Listening script: each sentence with its emotion and speaker (Devanagari for Hinglish); null = punctuation cues only.
  const script = useRef<{ key: string; sentences: ScriptSentence[][] } | null>(null);
  const textAt = (k: number) => (script.current ? script.current.sentences[k].map((x) => x.text).join(" ") : paragraphs[k]);
  /** The sentences to perform for paragraph k: from the script, or derived from punctuation. */
  const performed = (k: number): ScriptSentence[] =>
    script.current?.sentences[k] ??
    speechSentences(paragraphs[k])
      .flatMap((x) => sentences(x))
      .map((t) => {
        const d = delivery(t);
        const q = /\?["”']?$/.test(t);
        const ex = /!["”']?$/.test(t);
        return { text: t, intensity: 2, speaker: "narrator" as const, emotion: d.pauseAfter >= 0.7 ? ("whisper" as const) : ex ? ("excited" as const) : q ? ("surprised" as const) : d.noise > 1.1 ? ("happy" as const) : ("neutral" as const) };
      });
  const deviceLang: VoiceLang = lang === "hinglish" ? "en" : lang;

  // Choose the engine: saved preference first, then AI if allowed, else the device.
  useEffect(() => {
    setDeviceOk(typeof window !== "undefined" && "speechSynthesis" in window);
    setPiperOk(piperSupported());
    if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
    const pref = readPref();
    if (pref?.startsWith("piper:") && piperSupported() && piperVoice(pref.slice(6))) {
      setEngineChoice("piper");
      setPiperId(pref.slice(6) as PiperVoiceId);
    } else if (ai?.allowed && pref !== "device") setEngineChoice("ai");
    else setEngineChoice("device");
    const map = urls.current;
    return () => {
      run.current += 1;
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      audio.current?.pause();
      map.forEach((p) => p.then((u) => URL.revokeObjectURL(u)).catch(() => {}));
    };
  }, [ai?.allowed]);

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
    const say = (k: number) => {
      if (myRun !== run.current) return;
      if (k >= paragraphs.length) return finish();
      index.current = k;
      onParagraph?.(k);
      const pieces = performed(k).flatMap((x) => sentences(x.text).map((t) => ({ ...x, text: t })));
      const { lang: code, voice } = bestVoice(langOf(textAt(k)));
      const speakPiece = (j: number) => {
        if (myRun !== run.current) return;
        // A short breath between paragraphs.
        if (j >= pieces.length) return void setTimeout(() => say(k + 1), 380);
        const u = new SpeechSynthesisUtterance(pieces[j].text);
        u.lang = code;
        if (voice) u.voice = voice;
        // Perform the sentence's emotion and speaker through pitch, pace and loudness.
        const pf = perform(pieces[j], "female");
        u.rate = Math.max(0.5, Math.min(2, (r * 0.97) / pf.pace));
        u.pitch = Math.max(0.5, Math.min(2, 1 + (pf.pitch - 1) * 1.6));
        u.volume = Math.max(0.3, Math.min(1, pf.volume));
        u.onend = () => setTimeout(() => speakPiece(j + 1), Math.round(pf.pause * 250));
        u.onerror = (e) => {
          if (e.error !== "interrupted" && e.error !== "canceled") speakPiece(j + 1);
        };
        synth.speak(u);
      };
      speakPiece(0);
    };
    setState("playing");
    say(i);
  };

  const fetchPart = (kind: "ai" | "piper", k: number) => {
    const key = `${kind}:${kind === "piper" ? `${piperId}:${script.current?.key ?? ""}` : ""}:${k}`;
    let p = urls.current.get(key);
    if (!p) {
      p = kind === "ai" ? (ai ? aiPart(ai.sessionId, k) : Promise.reject(new Error("no ai"))) : script.current ? synthesizeScript(piperId!, script.current.sentences[k]) : synthesize(piperId!, paragraphs[k]);
      urls.current.set(key, p);
      p.catch(() => urls.current.delete(key));
    }
    return p;
  };

  const playAudio = (kind: "ai" | "piper", i: number, r = rate) => {
    const myRun = ++run.current;
    engine.current = kind;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    const el = (audio.current ??= new Audio());
    const next = async (k: number) => {
      if (myRun !== run.current) return;
      if (k >= paragraphs.length) return finish();
      index.current = k;
      onParagraph?.(k);
      try {
        const key = `${kind}:${kind === "piper" ? `${piperId}:${script.current?.key ?? ""}` : ""}:${k}`;
        if (!urls.current.has(key)) setState("loading");
        const src = await fetchPart(kind, k);
        if (myRun !== run.current) return;
        if (k + 1 < paragraphs.length) fetchPart(kind, k + 1).catch(() => {});
        el.src = src;
        el.playbackRate = r;
        el.onended = () => next(k + 1);
        await el.play();
        setState("playing");
      } catch (e) {
        if (myRun !== run.current) return;
        // Limit reached, offline, or the engine failed: carry on with the device voice.
        setNote(kind === "ai" && (e as Error).message === "402" ? "AI voice limit reached · phone voice" : "Phone ki awaaz par switch kiya");
        setEngineChoice("device");
        if (deviceOk) speakDevice(k, r);
        else setState("idle");
      }
    };
    setState("loading");
    void next(i);
  };

  /**
   * Fetch the emotion script once (cached on the server too). Hinglish scripts are in
   * Devanagari, so they need a Hindi voice; otherwise punctuation cues are used.
   */
  const ensureScript = async () => {
    const hindiPiper = engineChoice === "piper" && piperVoice(piperId ?? "")?.lang === "hi";
    const topHindi = rankedVoices("hi")[0];
    const goodHindiPhone = engineChoice === "device" && topHindi && voiceScore(topHindi, "hi") >= GOOD_VOICE;
    if (!sessionId || (lang === "hinglish" && !(hindiPiper || goodHindiPhone))) {
      script.current = null;
      return;
    }
    const key = paragraphs.join("\n").length + ":" + paragraphs.length;
    if (script.current?.key === key) return;
    try {
      const res = await fetch("/api/story/narration", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ session_id: sessionId }) });
      const json = (await res.json()) as { sentences?: ScriptSentence[][] | null };
      script.current = json.sentences && json.sentences.length === paragraphs.length ? { key, sentences: json.sentences } : null;
    } catch {
      script.current = null;
    }
  };

  const start = async (i: number, r = rate) => {
    if (!(engineChoice === "ai" && ai?.allowed)) {
      setState("loading");
      await ensureScript();
    }
    if (engineChoice === "ai" && ai?.allowed) return playAudio("ai", i, r);
    if (engineChoice === "piper" && piperId) return playAudio("piper", i, r);
    return speakDevice(i, r);
  };

  const stopAll = () => {
    run.current += 1;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    audio.current?.pause();
    setState("idle");
  };

  const toggle = () => {
    if (state === "playing") {
      if (engine.current === "device") window.speechSynthesis.pause();
      else audio.current?.pause();
      setState("paused");
    } else if (state === "paused") {
      setState("playing");
      if (engine.current !== "device") audio.current?.play().catch(() => void start(index.current));
      else {
        const synth = window.speechSynthesis;
        synth.resume();
        // Some browsers drop a long pause; restart the current paragraph if nothing is speaking.
        setTimeout(() => {
          if (!synth.speaking) speakDevice(index.current);
        }, 300);
      }
    } else if (state === "idle") void start(0);
  };

  const cycleRate = () => {
    const r = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    setRate(r);
    if (engine.current !== "device" && audio.current) audio.current.playbackRate = r;
    else if (state === "playing") speakDevice(index.current, r);
  };

  /** Called by the voice sheet; restarts the current paragraph with the new engine. */
  const choose = useCallback(
    (e: Engine, id?: PiperVoiceId) => {
      setEngineChoice(e);
      setNote(null);
      if (e === "piper" && id) {
        setPiperId(id);
        writePref(`piper:${id}`);
      } else writePref(e);
      if (state !== "idle") stopAll();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state],
  );

  if (!deviceOk && !ai?.allowed && !piperOk) return null;
  const label = engineChoice === "ai" ? "AI voice" : engineChoice === "piper" ? "HD voice" : "Phone voice";
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={() => setSheet(true)}
        aria-label={t("Choose voice. Now: {0}", label)}
        title={note ?? t("Awaaz: {0}", label)}
        className={cx(
          "inline-flex h-8 items-center gap-1 rounded-full px-2 text-xs font-bold transition",
          engineChoice === "device" ? "text-muted hover:bg-bg" : "bg-sun-soft text-warning",
        )}
      >
        {engineChoice === "device" ? <Settings2 className="size-4" /> : <Sparkles className="size-4" />}
        <span className="hidden sm:inline">{t(label)}</span>
      </button>
      <button
        type="button"
        onClick={toggle}
        disabled={state === "loading"}
        aria-label={state === "playing" ? t("Pause listening") : state === "paused" ? t("Resume listening") : state === "loading" ? t("Preparing audio") : t("Listen to the story")}
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
        {state === "idle" ? t("Listen") : state === "playing" ? t("Pause") : state === "loading" ? "…" : t("Play")}
      </button>
      {state !== "idle" && (
        <button type="button" onClick={cycleRate} aria-label={t("Speed {0}x", rate)} className="h-8 rounded-full px-2 text-xs font-bold tabular-nums text-muted hover:bg-bg">{t("{0}x", rate)}</button>
      )}
      {sheet &&
        createPortal(
        <VoiceSheet
          onClose={() => setSheet(false)}
          lang={lang}
          deviceLang={deviceLang}
          ai={ai ?? null}
          current={{ engine: engineChoice, piperId }}
          onChoose={(e, id) => {
            choose(e, id);
            if (e !== "piper") setSheet(false);
          }}
        />,
          document.body,
        )}
    </div>
  );
}

/* ------------------------------------------------------------- Voice sheet */

function VoiceSheet({
  onClose,
  lang,
  deviceLang,
  ai,
  current,
  onChoose,
}: {
  onClose: () => void;
  lang: VoiceLang | "hinglish";
  deviceLang: VoiceLang;
  ai: AIVoice | null;
  current: { engine: Engine; piperId: PiperVoiceId | null };
  onChoose: (e: Engine, id?: PiperVoiceId) => void;
}) {
  const t = useT();
  const [ready, setReady] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [device, setDevice] = useState<SpeechSynthesisVoice[]>([]);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const sample = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const load = () => setDevice(rankedVoices(deviceLang).slice(0, 5));
    load();
    setDeviceName(savedVoiceName(deviceLang) ?? rankedVoices(deviceLang)[0]?.name ?? null);
    window.speechSynthesis?.addEventListener?.("voiceschanged", load);
    Promise.all(PIPER_VOICES.map(async (v) => [v.id, await isDownloaded(v.id)] as const)).then((r) => setReady(Object.fromEntries(r)));
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => {
      window.speechSynthesis?.removeEventListener?.("voiceschanged", load);
      window.removeEventListener("keydown", esc);
      sample.current?.pause();
      window.speechSynthesis?.cancel();
    };
  }, [deviceLang, onClose]);

  const playSample = (src: string) => {
    window.speechSynthesis?.cancel();
    sample.current?.pause();
    sample.current = new Audio(src);
    void sample.current.play().catch(() => {});
  };
  const previewDevice = (v: SpeechSynthesisVoice) => {
    sample.current?.pause();
    const s = window.speechSynthesis;
    s.cancel();
    const u = new SpeechSynthesisUtterance(VOICE_HELLO[deviceLang]);
    u.voice = v;
    u.lang = v.lang;
    s.speak(u);
  };

  const getPiper = async (id: PiperVoiceId) => {
    setError(null);
    if (!ready[id]) {
      setProgress((p) => ({ ...p, [id]: 0 }));
      try {
        await loadVoice(id, (l, t) => setProgress((p) => ({ ...p, [id]: t ? Math.round((l / t) * 100) : Math.min(99, Math.round(l / 640_000)) })));
        setReady((r) => ({ ...r, [id]: true }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Download nahi hua. Wi-Fi par dobara try karo.");
        setProgress((p) => {
          const n = { ...p };
          delete n[id];
          return n;
        });
        return;
      }
      setProgress((p) => {
        const n = { ...p };
        delete n[id];
        return n;
      });
    }
    onChoose("piper", id);
  };

  // Roman Hinglish and Hindi stories: Hindi voices first; English stories: English voices first.
  const piperList = [...PIPER_VOICES].sort((a, b) => Number(b.lang === (lang === "en" ? "en" : "hi")) - Number(a.lang === (lang === "en" ? "en" : "hi")));
  const bestDeviceScore = device[0] ? voiceScore(device[0], deviceLang) : 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/40 sm:items-center" role="dialog" aria-modal="true" aria-label={t("Choose a voice")} onClick={onClose}>
      <div
        className="animate-page max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface p-5 shadow-raised sm:rounded-3xl"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{t("Awaaz chuno")}</h2>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="rounded-full p-1.5 text-muted hover:bg-bg">
            <X className="size-5" />
          </button>
        </div>

        {ai && (
          <section className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">{t("✨ AI narrator")}</p>
            {ai.allowed ? (
              <Row
                selected={current.engine === "ai"}
                title={t("AI narrator")}
                sub={ai.pro ? t("Sabse natural · Pro") : t("{0} free story is mahine", ai.remaining)}
                onSelect={() => onChoose("ai")}
              />
            ) : (
              <Link href="/pricing" className="mt-2 block rounded-2xl border border-dashed border-line p-3 text-sm text-muted hover:border-primary/40">{t("AI narrator · Pro mein milta hai →")}</Link>
            )}
          </section>
        )}

        {piperSupported() && (
          <section className="mt-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">{t("🎧 HD awaaz · free · offline")}</p>
            <p className="mt-1 text-xs text-muted">{t("Ek baar download (~100 MB pehli baar, Wi-Fi par), phir hamesha free aur bina internet.")}</p>
            <div className="mt-2 space-y-2">
              {piperList.map((v) => (
                <div
                  key={v.id}
                  className={cx(
                    "flex items-center gap-2 rounded-2xl border p-3",
                    current.engine === "piper" && current.piperId === v.id ? "border-primary bg-primary-soft" : "border-line",
                  )}
                >
                  <button type="button" onClick={() => playSample(v.sample)} aria-label={t("Sample: {0}", v.label)} className="rounded-full bg-bg p-2 text-primary hover:brightness-95">
                    <Volume2 className="size-4" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{t(v.label)}</p>
                    <p className="text-xs text-muted">
                      {progress[v.id] != null ? t("Download ho raha hai… {0}%", progress[v.id]) : ready[v.id] ? t("Ready ✓") : t("~64 MB")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => getPiper(v.id)}
                    disabled={progress[v.id] != null}
                    aria-label={ready[v.id] ? t("Use {0}", v.label) : t("Download {0}", v.label)}
                    className={cx("rounded-full px-3 py-1.5 text-xs font-bold", ready[v.id] ? "bg-primary text-white" : "bg-primary-soft text-primary")}
                  >
                    {current.engine === "piper" && current.piperId === v.id ? (
                      <Check className="size-4" />
                    ) : ready[v.id] ? (
                      t("Use")
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Download className="size-3.5" />{" "}{t("Get")}</span>
                    )}
                  </button>
                </div>
              ))}
            </div>
            {error && <p className="mt-2 text-xs text-danger">{t(error)}</p>}
          </section>
        )}

        {device.length > 0 && (
          <section className="mt-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">{t("📱 Phone ki awaaz · turant")}</p>
            <div className="mt-2 space-y-2">
              {device.map((v) => (
                <Row
                  key={v.name}
                  selected={current.engine === "device" && deviceName === v.name}
                  title={v.name.replace(/\s*\(.*?\)\s*/g, " ").trim()}
                  sub={`${v.lang}${voiceScore(v, deviceLang) >= GOOD_VOICE ? " · natural" : ""}`}
                  onPreview={() => previewDevice(v)}
                  onSelect={() => {
                    saveVoiceName(deviceLang, v.name);
                    setDeviceName(v.name);
                    onChoose("device");
                  }}
                />
              ))}
            </div>
            {bestDeviceScore < GOOD_VOICE && <p className="mt-2 rounded-xl bg-bg p-3 text-xs leading-relaxed text-muted">💡 {voiceTip(deviceLang)}</p>}
          </section>
        )}
      </div>
    </div>
  );
}

function Row({ selected, title, sub, onSelect, onPreview }: { selected: boolean; title: string; sub: string; onSelect: () => void; onPreview?: () => void }) {
  const t = useT();
  return (
    <div className={cx("mt-2 flex items-center gap-2 rounded-2xl border p-3", selected ? "border-primary bg-primary-soft" : "border-line")}>
      {onPreview && (
        <button type="button" onClick={onPreview} aria-label={t("Preview {0}", title)} className="rounded-full bg-bg p-2 text-primary hover:brightness-95">
          <Volume2 className="size-4" />
        </button>
      )}
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left">
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{t(title)}</span>
          <span className="block text-xs text-muted">{t(sub)}</span>
        </span>
        {selected && <Check className="size-4 shrink-0 text-primary" />}
      </button>
    </div>
  );
}
