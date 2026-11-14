"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { analyseSpeech, type SpeechMetrics } from "@/lib/domain/speech";

// Minimal typings for the Web Speech API (not in TypeScript's DOM lib everywhere).
type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecognition(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Speech-to-text in the browser (Chrome, Edge, Safari). Audio is processed by
 * the browser's own speech service; nothing is recorded or uploaded by the app.
 */
export function useSpeech(lang: string) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const startedAt = useRef(0);
  const spokenMs = useRef(0);
  const lastResultAt = useRef(0);
  const longestPause = useRef(0);
  const wantListening = useRef(false);

  useEffect(() => setSupported(Boolean(getRecognition())), []);

  const start = useCallback(() => {
    const Ctor = getRecognition();
    if (!Ctor) return;
    setError(null);
    const r = new Ctor();
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      const now = Date.now();
      if (lastResultAt.current) longestPause.current = Math.max(longestPause.current, now - lastResultAt.current);
      lastResultAt.current = now;
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) setFinalText((t) => `${t} ${res[0].transcript}`.trim());
        else interimText += res[0].transcript;
      }
      setInterim(interimText);
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") setError("Microphone permission was denied. Allow it in your browser settings to practise by voice.");
      else if (e.error !== "no-speech" && e.error !== "aborted") setError("Voice input stopped unexpectedly. Tap the mic to continue.");
    };
    r.onend = () => {
      // Browsers end recognition after silence; keep going while the user wants it.
      if (wantListening.current) {
        try {
          r.start();
          return;
        } catch {
          /* fall through */
        }
      }
      spokenMs.current += Date.now() - startedAt.current;
      setListening(false);
      setInterim("");
    };
    rec.current = r;
    wantListening.current = true;
    startedAt.current = Date.now();
    lastResultAt.current = 0;
    try {
      r.start();
      setListening(true);
    } catch {
      setError("Could not start the microphone.");
    }
  }, [lang]);

  const stop = useCallback(() => {
    wantListening.current = false;
    rec.current?.stop();
  }, []);

  const reset = useCallback(() => {
    wantListening.current = false;
    rec.current?.stop();
    setFinalText("");
    setInterim("");
    spokenMs.current = 0;
    longestPause.current = 0;
  }, []);

  const metrics = useCallback(
    (transcript: string): SpeechMetrics => {
      const running = listening ? Date.now() - startedAt.current : 0;
      return analyseSpeech(transcript, spokenMs.current + running, longestPause.current);
    },
    [listening],
  );

  return { supported, listening, transcript: finalText, interim, error, start, stop, reset, metrics, setTranscript: setFinalText };
}
