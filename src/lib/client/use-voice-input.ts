"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/domain/languages";
import { languageInfo } from "@/lib/domain/languages";

export type VoicePhase = "idle" | "listening" | "thinking" | "error";
const MAX_SECONDS = 180;

let serverAvailable: Promise<boolean> | null = null;
/** Asks once per page load whether the server has a transcription model. */
function checkServer(): Promise<boolean> {
  serverAvailable ??= fetch("/api/transcribe")
    .then((r) => (r.ok ? r.json() : { available: false }))
    .then((j: { available?: boolean }) => Boolean(j.available))
    .catch(() => false);
  return serverAvailable;
}

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  start: () => void; stop: () => void; abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
const recognitionCtor = (): (new () => Recognition) | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
const pickMime = () => {
  if (typeof MediaRecorder === "undefined") return "";
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) if (MediaRecorder.isTypeSupported?.(t)) return t;
  return "";
};

/**
 * Speak instead of typing. Records the voice and sends it to the server model
 * (best quality, every Indian language); if no model is set up, falls back to
 * the browser's own speech recognition. `onLevel` gets the loudness 0..1 per frame.
 */
export function useVoiceInput(lang: Language, onLevel?: (lvl: number, bars: number[]) => void) {
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [live, setLive] = useState("");
  const [error, setError] = useState<string | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const ctx = useRef<AudioContext | null>(null);
  const raf = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const speech = useRef<Recognition | null>(null);
  const finalText = useRef("");
  const resolver = useRef<((t: string) => void) | null>(null);
  const cancelled = useRef(false);
  const levelCb = useRef(onLevel);
  levelCb.current = onLevel;

  const cleanup = useCallback(() => {
    cancelAnimationFrame(raf.current);
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    ctx.current?.close().catch(() => {});
    ctx.current = null;
    levelCb.current?.(0, []);
  }, []);
  useEffect(() => () => {
    cancelled.current = true;
    try { rec.current?.stop(); } catch {}
    try { speech.current?.abort(); } catch {}
    cleanup();
  }, [cleanup]);

  const meter = (s: MediaStream) => {
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ac = new AC();
      ctx.current = ac;
      const an = ac.createAnalyser();
      an.fftSize = 256;
      ac.createMediaStreamSource(s).connect(an);
      const data = new Uint8Array(an.frequencyBinCount);
      const tick = () => {
        an.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 2; i < 60; i++) sum += data[i];
        const lvl = Math.min(1, (sum / 58 / 255) * 2.2);
        const bars = Array.from({ length: 7 }, (_, i) => Math.min(1, (data[4 + i * 7] / 255) * 1.6));
        levelCb.current?.(lvl, bars);
        raf.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      /* no meter: the orb still breathes */
    }
  };

  const startTimer = (stop: () => void) => {
    setSeconds(0);
    const t0 = Date.now();
    timer.current = setInterval(() => {
      const s = Math.floor((Date.now() - t0) / 1000);
      setSeconds(s);
      if (s >= MAX_SECONDS) stop();
    }, 250);
  };

  /** Starts listening. Resolves with the text once `finish()` is called (or "" if cancelled). */
  const start = useCallback(async (): Promise<string> => {
    setError(null);
    setLive("");
    finalText.current = "";
    cancelled.current = false;
    const server = await checkServer();
    const Rec = recognitionCtor();
    if (!server && !Rec) {
      setPhase("error");
      setError("Is browser mein voice input nahi chalta. Chrome ya Safari mein kholo, ya type karo.");
      return "";
    }
    return new Promise<string>((resolve) => {
      resolver.current = resolve;
      const done = (t: string) => {
        resolver.current = null;
        resolve(cancelled.current ? "" : t);
      };
      if (server) {
        navigator.mediaDevices
          .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
          .then((s) => {
            stream.current = s;
            meter(s);
            const mime = pickMime();
            const mr = new MediaRecorder(s, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined);
            rec.current = mr;
            chunks.current = [];
            mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
            mr.onstop = async () => {
              cleanup();
              if (cancelled.current) return done("");
              setPhase("thinking");
              const blob = new Blob(chunks.current, { type: (mr.mimeType || mime || "audio/webm").split(";")[0] });
              const fd = new FormData();
              fd.append("audio", blob, "voice");
              fd.append("lang", lang);
              try {
                const r = await fetch("/api/transcribe", { method: "POST", body: fd });
                const j = (await r.json().catch(() => ({}))) as { text?: string; error?: string };
                if (!r.ok) throw new Error(j.error || "Awaaz samajh nahi aayi.");
                setPhase("idle");
                done((j.text ?? "").trim());
              } catch (e) {
                setPhase("error");
                setError((e as Error).message);
                done("");
              }
            };
            mr.start(1000);
            setPhase("listening");
            startTimer(() => mr.state === "recording" && mr.stop());
          })
          .catch(() => {
            setPhase("error");
            setError("Mic ki permission nahi mili. Browser settings mein microphone allow karo.");
            done("");
          });
        return;
      }
      // Browser speech recognition (no server model).
      const r = new Rec!();
      speech.current = r;
      r.lang = lang === "hinglish" ? "en-IN" : languageInfo(lang).speech;
      r.continuous = true;
      r.interimResults = true;
      let want = true;
      r.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) finalText.current = `${finalText.current} ${res[0].transcript}`.trim();
          else interim += res[0].transcript;
        }
        setLive(`${finalText.current} ${interim}`.trim());
        levelCb.current?.(0.6 + Math.random() * 0.4, Array.from({ length: 7 }, () => Math.random()));
        setTimeout(() => levelCb.current?.(0.15, []), 180);
      };
      r.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          want = false;
          setPhase("error");
          setError("Mic ki permission nahi mili. Browser settings mein microphone allow karo.");
        }
      };
      r.onend = () => {
        if (want && !cancelled.current && speech.current === r && resolver.current) {
          try { r.start(); return; } catch {}
        }
        cleanup();
        if (phaseRef.current !== "error") setPhase("idle");
        done(finalText.current);
      };
      (r as Recognition & { _stop?: () => void })._stop = () => { want = false; r.stop(); };
      try {
        r.start();
        setPhase("listening");
        startTimer(() => { want = false; r.stop(); });
      } catch {
        setPhase("error");
        setError("Mic start nahi hua.");
        done("");
      }
    });
  }, [lang, cleanup]);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  /** Stop and transcribe. */
  const finish = useCallback(() => {
    if (rec.current && rec.current.state === "recording") rec.current.stop();
    const r = speech.current as (Recognition & { _stop?: () => void }) | null;
    if (r?._stop) r._stop();
  }, []);

  /** Stop and throw the recording away. */
  const cancel = useCallback(() => {
    cancelled.current = true;
    if (rec.current && rec.current.state === "recording") rec.current.stop();
    try { speech.current?.abort(); } catch {}
    cleanup();
    setPhase("idle");
    resolver.current?.("");
    resolver.current = null;
  }, [cleanup]);

  return { phase, seconds, live, error, start, finish, cancel, maxSeconds: MAX_SECONDS };
}
