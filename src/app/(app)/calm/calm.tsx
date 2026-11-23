"use client";

import { useEffect, useRef, useState } from "react";
import { Flame, Pause, Play, Wind } from "lucide-react";
import { Button, Card, cx } from "@/components/ui";
import { VoiceTextarea } from "@/components/voice-input";

const buzz = (ms: number) => {
  try {
    navigator.vibrate?.(ms);
  } catch {}
};

/* ---------------------------------------------------------------- Breathe */

type Step = readonly [label: string, seconds: number, scale: number];
const PATTERNS: Record<"box" | "calm", { label: string; steps: readonly Step[] }> = {
  box: { label: "Box 4·4·4·4", steps: [["Saans andar", 4, 1], ["Roko", 4, 1], ["Dheere bahar", 4, 0.55], ["Roko", 4, 0.55]] },
  calm: { label: "Calm 4·7·8", steps: [["Saans andar", 4, 1], ["Roko", 7, 1], ["Dheere bahar", 8, 0.55]] },
};
type PatternId = keyof typeof PATTERNS;

export function Breathe() {
  const [pattern, setPattern] = useState<PatternId>("box");
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [left, setLeft] = useState(0);
  const [rounds, setRounds] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  const steps = PATTERNS[pattern].steps;
  const [label, , scale] = steps[step];

  const start = () => {
    setRunning(true);
    setStep(0);
    setRounds(0);
    setLeft(steps[0][1]);
    buzz(30);
    let s = 0;
    let remaining = steps[0][1];
    timer.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        s = (s + 1) % steps.length;
        if (s === 0) setRounds((r) => r + 1);
        remaining = steps[s][1];
        setStep(s);
        buzz(20);
      }
      setLeft(remaining);
    }, 1000);
  };
  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setRunning(false);
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <h2 className="flex items-center gap-2 text-[15px] font-bold">
          <Wind className="size-4 text-accent" /> Breathe
        </h2>
        <div className="flex gap-1 rounded-full bg-bg p-1" role="radiogroup" aria-label="Breathing pattern">
          {(Object.keys(PATTERNS) as PatternId[]).map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={pattern === id}
              disabled={running}
              onClick={() => setPattern(id)}
              className={cx("rounded-full px-3 py-1 text-xs font-semibold", pattern === id ? "bg-surface text-ink shadow-card" : "text-muted")}
            >
              {PATTERNS[id].label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col items-center gap-5 px-5 py-8">
        <div className="relative flex size-56 items-center justify-center">
          <div
            className="absolute inset-0 rounded-full bg-accent/20"
            style={{ transform: `scale(${running ? scale : 0.6})`, transition: `transform ${running ? steps[step][1] : 0.6}s ease-in-out` }}
          />
          <div
            className="absolute inset-6 rounded-full bg-accent/30"
            style={{ transform: `scale(${running ? scale : 0.6})`, transition: `transform ${running ? steps[step][1] : 0.6}s ease-in-out` }}
          />
          <div className="relative text-center" aria-live="polite">
            <p className="text-lg font-bold">{running ? label : "Tayyar?"}</p>
            <p className="text-4xl font-extrabold tabular-nums">{running ? left : "·"}</p>
          </div>
        </div>
        <p className="text-sm text-muted">{running ? `${rounds} round${rounds === 1 ? "" : "s"} · 4 rounds ≈ 1 minute` : "Aankhein band karna ho to kar lo. Phone halka vibrate karega."}</p>
        <Button onClick={running ? stop : start} variant={running ? "secondary" : "accent"}>
          {running ? <Pause className="size-4" /> : <Play className="size-4" />} {running ? "Ruko" : "Shuru karo"}
        </Button>
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------- Vent & burn */

export function VentAndBurn() {
  const [text, setText] = useState("");
  const [burning, setBurning] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const burn = () => {
    if (!text.trim()) return;
    setBurning(text.slice(0, 600));
    setText("");
    setDone(false);
    buzz(60);
    setTimeout(() => {
      setBurning(null);
      setDone(true);
    }, 2600);
  };

  return (
    <Card className="overflow-hidden">
      <div className="px-5 pt-5">
        <h2 className="flex items-center gap-2 text-[15px] font-bold">
          <Flame className="size-4 text-coral" /> Vent &amp; Burn
        </h2>
        <p className="mt-0.5 text-xs text-muted">Jo dil mein hai likh do. Jalate hi gayab. Kahin save nahi hota, kisi ko nahi dikhta.</p>
      </div>
      <div className="p-5">
        {burning ? (
          <div className="relative min-h-40 overflow-hidden rounded-2xl bg-ink p-4 text-sm leading-relaxed text-surface" aria-live="polite" aria-label="Burning">
            <p className="burn-text">
              {burning.split("").map((ch, i) => (
                <span key={i} style={{ animationDelay: `${Math.min(1.6, (i / Math.max(1, burning.length)) * 1.6)}s` }}>
                  {ch}
                </span>
              ))}
            </p>
            <div className="burn-fire pointer-events-none absolute inset-x-0 bottom-0 h-full" />
          </div>
        ) : (
          <>
            <VoiceTextarea
              id="vent-text"
              rows={5}
              maxLength={2000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Aaj kis baat ne pareshan kiya? Jo mann mein aaye, bina filter…"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-sm text-muted" role="status">
                {done ? "🌬️ Raakh ho gaya. Ek gehri saans lo." : ""}
              </p>
              <Button onClick={burn} disabled={!text.trim()} className="bg-coral text-white hover:brightness-95">
                <Flame className="size-4" /> Jalao
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

/* --------------------------------------------------------------- Sounds */

type SoundId = "rain" | "ocean" | "deep";
const SOUNDS: { id: SoundId; label: string; emoji: string }[] = [
  { id: "rain", label: "Baarish", emoji: "🌧️" },
  { id: "ocean", label: "Samundar", emoji: "🌊" },
  { id: "deep", label: "Deep focus", emoji: "🟤" },
];

/** Generates noise in the browser (no downloads): rain, slow ocean waves or brown noise. */
function startSound(ctx: AudioContext, id: SoundId, volume: GainNode) {
  const seconds = 4;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    if (id === "rain") data[i] = white * 0.5;
    else {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = id === "rain" ? "bandpass" : "lowpass";
  filter.frequency.value = id === "rain" ? 1400 : id === "ocean" ? 600 : 400;
  filter.Q.value = id === "rain" ? 0.6 : 0.7;
  const shape = ctx.createGain();
  shape.gain.value = id === "ocean" ? 0.5 : 1;
  src.connect(filter).connect(shape).connect(volume);
  const nodes: AudioNode[] = [src, filter, shape];
  if (id === "ocean") {
    // A slow swell every ~8 seconds.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const depth = ctx.createGain();
    depth.gain.value = 0.45;
    lfo.connect(depth).connect(shape.gain);
    lfo.start();
    nodes.push(lfo, depth);
  }
  src.start();
  return () => nodes.forEach((n) => {
    try {
      (n as AudioScheduledSourceNode).stop?.();
    } catch {}
    n.disconnect();
  });
}

export function Sounds() {
  const [playing, setPlaying] = useState<SoundId | null>(null);
  const [vol, setVol] = useState(0.5);
  const [minutes, setMinutes] = useState(10);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [, setNow] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  const stop = () => {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(null);
    setEndsAt(null);
  };

  useEffect(() => {
    if (!endsAt) return;
    const t = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= endsAt) stop();
    }, 1000);
    return () => clearInterval(t);
  }, [endsAt]);

  useEffect(() => () => {
    stopRef.current?.();
    void ctxRef.current?.close();
  }, []);

  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = vol * 0.6;
  }, [vol]);

  const play = (id: SoundId) => {
    if (playing === id) return stop();
    stopRef.current?.();
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = (ctxRef.current ??= new AC());
    void ctx.resume();
    if (!gainRef.current) {
      gainRef.current = ctx.createGain();
      gainRef.current.connect(ctx.destination);
    }
    gainRef.current.gain.value = vol * 0.6;
    stopRef.current = startSound(ctx, id, gainRef.current);
    setPlaying(id);
    setEndsAt(Date.now() + minutes * 60_000);
  };

  const remaining = endsAt ? Math.max(0, Math.ceil((endsAt - Date.now()) / 60_000)) : null;

  return (
    <Card className="p-5">
      <h2 className="text-[15px] font-bold">🎧 Sukoon ki awaaz</h2>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {SOUNDS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => play(s.id)}
            aria-pressed={playing === s.id}
            className={cx(
              "flex flex-col items-center gap-1 rounded-2xl border-2 py-4 transition-all active:scale-95",
              playing === s.id ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-accent/40",
            )}
          >
            <span className={cx("text-3xl", playing === s.id && "motion-safe:animate-pulse")}>{s.emoji}</span>
            <span className="text-xs font-semibold">{s.label}</span>
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-muted" htmlFor="calm-vol">
          Awaaz
          <input id="calm-vol" type="range" min={0} max={1} step={0.05} value={vol} onChange={(e) => setVol(Number(e.target.value))} className="mt-1 w-full" />
        </label>
        <div className="text-xs font-semibold text-muted">
          Timer
          <div className="mt-1 flex gap-1">
            {[5, 10, 20].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMinutes(m);
                  if (playing) setEndsAt(Date.now() + m * 60_000);
                }}
                aria-pressed={minutes === m}
                className={cx("flex-1 rounded-full py-1.5 text-xs font-bold", minutes === m ? "bg-primary text-white" : "bg-bg text-muted")}
              >
                {m} min
              </button>
            ))}
          </div>
        </div>
      </div>
      {remaining != null && <p className="mt-3 text-xs text-muted" role="status">{`${remaining} min mein apne aap band ho jaayega`}</p>}
    </Card>
  );
}

/* ------------------------------------------------------------ Grounding */

const GROUND = [
  { n: 5, text: "cheezein jo tum abhi dekh sakte ho", emoji: "👀" },
  { n: 4, text: "cheezein jo tum chhoo sakte ho", emoji: "✋" },
  { n: 3, text: "awaazein jo tum sun sakte ho", emoji: "👂" },
  { n: 2, text: "khushbu ya mehak jo tum mehsoos kar sakte ho", emoji: "👃" },
  { n: 1, text: "achhi baat apne baare mein", emoji: "💛" },
];

export function Grounding() {
  const [i, setI] = useState(-1);
  const g = GROUND[i];
  return (
    <Card className="p-5">
      <h2 className="text-[15px] font-bold">🌱 5-4-3-2-1 · ghabrahat mein</h2>
      {i < 0 ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm text-muted">Jab dimaag bhaag raha ho, ye 60 second tumhe abhi mein le aate hain.</p>
          <Button variant="secondary" onClick={() => setI(0)}>
            Shuru
          </Button>
        </div>
      ) : i < GROUND.length ? (
        <div key={i} className="animate-page mt-4 text-center">
          <p className="text-5xl">{g.emoji}</p>
          <p className="mt-2 text-4xl font-extrabold tabular-nums">{g.n}</p>
          <p className="mt-1 font-semibold">{g.text}</p>
          <p className="mt-1 text-xs text-muted">Dheere se, ek-ek karke, mann mein naam lo.</p>
          <Button className="mt-4" onClick={() => setI((n) => n + 1)}>
            {i === GROUND.length - 1 ? "Ho gaya" : "Agla"}
          </Button>
        </div>
      ) : (
        <div className="animate-page mt-4 text-center">
          <p className="text-4xl">🌿</p>
          <p className="mt-2 font-semibold">Wapas yahin, abhi mein. Shabash.</p>
          <Button variant="ghost" className="mt-2" onClick={() => setI(-1)}>
            Dobara
          </Button>
        </div>
      )}
    </Card>
  );
}
