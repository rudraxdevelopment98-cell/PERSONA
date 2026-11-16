"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Zap } from "lucide-react";
import { Alert, Button, Input, cx } from "@/components/ui";
import { postJSON } from "@/lib/client/api";

export type StoryChoiceData = { question: string; options: { id: string; text: string; vibe?: string }[] };

const SUSPENSE = ["Dil ki dhadkan tez…", "Sab ki nazar ek hi taraf…", "Ek saans… aur faisla…", "Kahani mud rahi hai…"];

/** The turning point: the reader decides what the protagonist does, then the episode continues from that choice. */
export function StoryChoice({ sessionId, choice }: { sessionId: string; choice: StoryChoiceData }) {
  const router = useRouter();
  const [picked, setPicked] = useState<string | null>(null);
  const [line, setLine] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const go = async () => {
    if (!picked) return;
    setBusy(true);
    setError(null);
    const t = setInterval(() => setTick((n) => n + 1), 2600);
    try {
      await postJSON("/api/session/story-choice", { session_id: sessionId, option: picked, line: line.trim() || undefined });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not continue the story. Try again.");
      setBusy(false);
    } finally {
      clearInterval(t);
    }
  };

  if (busy) {
    return (
      <div className="my-8 flex flex-col items-center gap-4 rounded-3xl bg-primary px-6 py-10 text-center text-white" role="status" aria-live="polite">
        <span className="relative flex size-16 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-white/20 motion-safe:animate-ping" />
          <Zap className="relative size-8 fill-current" />
        </span>
        <p key={tick} className="animate-page font-serif text-xl">
          {SUSPENSE[tick % SUSPENSE.length]}
        </p>
        <p className="text-sm text-white/70">Tumhari choice se kahani aage likhi ja rahi hai</p>
      </div>
    );
  }

  return (
    <section aria-label="Your choice" className="my-8 overflow-hidden rounded-3xl border-2 border-primary/30 bg-primary-soft">
      <div className="bg-primary px-5 py-4 text-white">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/75">
          <Zap className="size-3.5 fill-current" /> Faisla tumhara
        </p>
        <h3 className="mt-1 font-serif text-2xl font-semibold leading-snug">{choice.question}</h3>
      </div>
      <div className="grid gap-2.5 p-4 sm:p-5">
        {choice.options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setPicked(o.id)}
            aria-pressed={picked === o.id}
            className={cx(
              "flex items-start gap-3 rounded-2xl border-2 bg-surface p-4 text-left transition-all active:scale-[0.98]",
              picked === o.id ? "border-primary shadow-raised" : "border-transparent hover:border-primary/30",
            )}
          >
            {o.vibe && <span className="mt-0.5 shrink-0 rounded-full bg-bg px-2 py-0.5 text-xs font-bold">{o.vibe}</span>}
            <span className="font-semibold leading-snug">{o.text}</span>
          </button>
        ))}
        {picked && (
          <div className="animate-page space-y-2 pt-1">
            <label htmlFor="story-line" className="block text-sm font-semibold">
              Us pal hero kya bole? <span className="font-normal text-muted">(optional, tumhari line kahani mein aayegi)</span>
            </label>
            <Input id="story-line" maxLength={200} value={line} onChange={(e) => setLine(e.target.value)} placeholder="“Ek minute, meri baat suno…”" />
          </div>
        )}
        {error && <Alert tone="danger">{error}</Alert>}
        <Button onClick={go} disabled={!picked} className="mt-1 justify-self-end">
          Kahani aage badhao <ArrowRight className="size-4" />
        </Button>
      </div>
    </section>
  );
}
