"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import { Alert, Button, Spinner, cx } from "@/components/ui";
import type { CheckinQuestion } from "@/lib/ai/schemas";
import { MOMENT_TAGS } from "@/lib/domain/moment";
import { VoiceTextarea } from "@/components/voice-input";

type Answers = Record<string, string | number>;

const STYLE_TAG: Record<string, string> = {
  emoji: "😶‍🌫️ Mood meter",
  this_or_that: "⚡ This or that",
  would_you_rather: "🤔 Would you rather",
  quick_fire: "⏱️ Quick-fire · go with your gut",
  normal: "✍️ Tell me one thing",
};

const FACES = ["😩", "😣", "😕", "😐", "🙂", "😊", "😄", "😎", "🤩", "🔥"];

function styleOf(q: CheckinQuestion) {
  if (q.type === "scale") return "emoji";
  if (q.type === "text") return "normal";
  return q.style ?? ((q.options?.length ?? 0) === 2 ? "this_or_that" : "normal");
}

function EmojiScale({ q, value, onChange }: { q: CheckinQuestion; value?: number; onChange: (v: number) => void }) {
  const v = value ?? 0;
  return (
    <div className="space-y-4">
      <div className="flex h-24 items-center justify-center" aria-hidden>
        <span key={v} className="animate-pop text-7xl leading-none">
          {v ? FACES[v - 1] : "🫥"}
        </span>
      </div>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-pressed={value === n}
            aria-label={`${n}`}
            className={cx(
              "h-10 rounded-xl text-sm font-bold tabular-nums transition-all active:scale-90",
              value === n ? "bg-primary text-white" : n <= v ? "bg-primary-soft text-primary" : "bg-bg text-muted hover:text-ink",
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs font-medium text-muted">
        <span>{q.scale_low_label}</span>
        <span>{q.scale_high_label}</span>
      </div>
    </div>
  );
}

function Options({ q, style, value, onPick }: { q: CheckinQuestion; style: string; value?: string; onPick: (o: string) => void }) {
  const opts = q.options ?? [];
  if (style === "this_or_that" && opts.length === 2) {
    return (
      <div className="relative grid grid-cols-2 gap-3">
        {opts.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onPick(o)}
            aria-pressed={value === o}
            className={cx(
              "flex min-h-32 items-center justify-center rounded-3xl border-2 p-4 text-center text-base font-bold leading-snug transition-all active:scale-95",
              value === o ? "border-primary bg-primary text-white" : "border-line bg-surface hover:border-primary/40",
            )}
          >
            {o}
          </button>
        ))}
        <span className="pointer-events-none absolute left-1/2 top-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink text-xs font-black text-surface">
          VS
        </span>
      </div>
    );
  }
  return (
    <div className={cx("grid gap-2.5", style === "would_you_rather" && "sm:grid-cols-2")}>
      {opts.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onPick(o)}
          aria-pressed={value === o}
          className={cx(
            "rounded-2xl border-2 px-4 text-left text-[15px] font-semibold transition-all active:scale-[0.98]",
            style === "would_you_rather" ? "min-h-24 py-4" : "py-3.5",
            value === o ? "border-primary bg-primary-soft text-ink" : "border-line bg-surface text-ink hover:border-primary/40",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/** Quick-fire cards show a 5-second fuse; it is only a nudge, nothing happens when it runs out. */
function Fuse() {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-bg" aria-hidden>
      <div className="h-full origin-left rounded-full bg-coral motion-safe:animate-[fuse_5s_linear_forwards]" />
    </div>
  );
}

/**
 * The check-in as a deck of cards: one question at a time, big targets,
 * choices advance on their own. Answers stay private to the user.
 */
export type TodayMoment = { note?: string; tags?: string[]; skipped?: boolean };

/** The last, optional card: what happened today. Shapes today's session only. */
function MomentCard({ note, tags, onNote, onTags }: { note: string; tags: string[]; onNote: (v: string) => void; onTags: (t: string[]) => void }) {
  const toggle = (id: string) => {
    if (id === "nothing") return onTags(tags.includes("nothing") ? [] : ["nothing"]);
    const next = tags.filter((t) => t !== "nothing");
    onTags(next.includes(id) ? next.filter((t) => t !== id) : [...next, id]);
  };
  return (
    <div key="moment" data-checkin-card className="animate-page rounded-[28px] border-2 border-dashed border-primary/30 bg-surface p-5 shadow-card sm:p-7">
      <p className="text-xs font-bold uppercase tracking-wider text-accent">🌟 Aaj ka moment · optional</p>
      <h2 className="mt-2 text-xl font-extrabold leading-snug text-balance sm:text-2xl">Aaj kuch hua jo share karna chahoge?</h2>
      <p className="mt-1 text-sm text-muted">Aaj ka session isi ke hisaab se banega. Sirf aaj ke liye. Mann na ho to skip karo.</p>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Aaj kis baare mein">
        {MOMENT_TAGS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => toggle(t.id)}
            aria-pressed={tags.includes(t.id)}
            className={cx(
              "rounded-full border px-3 py-1.5 text-sm font-semibold transition active:scale-95",
              tags.includes(t.id) ? "border-primary bg-primary text-white" : "border-line bg-surface text-ink hover:border-primary/40",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <VoiceTextarea
        id="today-note"
        rows={4}
        maxLength={2000}
        className="mt-4"
        placeholder="Jaise: ghar par sabke saamne tok diya gaya, aur main kuch bol nahi paaya…"
        value={note}
        onChange={(e) => onNote(e.target.value)}
      />
    </div>
  );
}

/**
 * The check-in as a deck of cards: one question at a time, big targets,
 * choices advance on their own, and an optional "today's moment" card at the end.
 * Answers stay private to the user.
 */
export function CheckinDeck({
  questions,
  dayNumber,
  lensLabel,
  busy,
  error,
  onSubmit,
}: {
  questions: CheckinQuestion[];
  dayNumber: number;
  lensLabel: string | null;
  busy: boolean;
  error: string | null;
  onSubmit: (answers: Answers, today: TodayMoment) => void;
}) {
  const [answers, setAnswers] = useState<Answers>({});
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [i, setI] = useState(0);
  const advance = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (advance.current && clearTimeout(advance.current)), []);

  const total = questions.length + 1; // + the moment card
  const onMoment = i === questions.length;
  const q = questions[Math.min(i, questions.length - 1)];
  const style = styleOf(q);
  const answered = (x: CheckinQuestion) => {
    const v = answers[x.id];
    return v != null && String(v).trim().length > (x.type === "text" ? 1 : 0);
  };
  const allDone = questions.every(answered);
  const set = (v: string | number) => setAnswers((a) => ({ ...a, [q.id]: v }));
  const pick = (o: string) => {
    set(o);
    if (advance.current) clearTimeout(advance.current);
    advance.current = setTimeout(() => setI((n) => Math.min(n + 1, total - 1)), 380);
  };
  const firstOpen = questions.findIndex((x) => !answered(x));

  return (
    <section aria-label={`Check-in, day ${dayNumber}`} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold">
          Check-in <span className="text-muted">· Day {dayNumber}</span>
        </p>
        {lensLabel && <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">{lensLabel}</span>}
      </div>
      <div className="flex gap-1.5" aria-label={`Card ${i + 1} of ${total}`}>
        {[...questions.map((x) => ({ id: x.id, done: answered(x) })), { id: "moment", done: Boolean(note.trim() || tags.length) }].map((x, n) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setI(n)}
            aria-label={`Go to card ${n + 1}`}
            className={cx("h-1.5 flex-1 rounded-full transition-colors", n === i ? "bg-primary" : x.done ? "bg-primary/40" : "bg-line")}
          />
        ))}
      </div>

      {onMoment ? (
        <MomentCard note={note} tags={tags} onNote={setNote} onTags={setTags} />
      ) : (
        <div key={q.id} data-checkin-card className="animate-page rounded-[28px] border border-line/70 bg-surface p-5 shadow-card sm:p-7">
          <p className="text-xs font-bold uppercase tracking-wider text-accent">{STYLE_TAG[style] ?? STYLE_TAG.normal}</p>
          <h2 className="mt-2 text-xl font-extrabold leading-snug text-balance sm:text-2xl">{q.text}</h2>
          {style === "quick_fire" && (
            <div className="mt-3">
              <Fuse />
            </div>
          )}
          <div className="mt-5">
            {q.type === "scale" && <EmojiScale q={q} value={answers[q.id] as number | undefined} onChange={set} />}
            {q.type === "choice" && <Options q={q} style={style} value={answers[q.id] as string | undefined} onPick={pick} />}
            {q.type === "text" && (
              <VoiceTextarea
                rows={4}
                maxLength={2000}
                autoFocus
                placeholder="Ek-do line kaafi hai…"
                value={(answers[q.id] as string) ?? ""}
                onChange={(e) => set(e.target.value)}
              />
            )}
          </div>
        </div>
      )}

      {error && <Alert tone="danger">{error}</Alert>}
      {onMoment && !allDone && (
        <p className="text-center text-sm text-warning">
          Ek card baaki hai.{" "}
          <button type="button" className="font-bold underline" onClick={() => setI(firstOpen)}>
            Wahan chalo
          </button>
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={() => setI((n) => Math.max(0, n - 1))} disabled={i === 0} aria-label="Previous card">
          <ArrowLeft className="size-4" />
        </Button>
        {onMoment ? (
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={() => onSubmit(answers, { skipped: true })} disabled={!allDone || busy}>
              Skip, aaj nahi
            </Button>
            <Button onClick={() => onSubmit(answers, { note: note.trim() || undefined, tags })} disabled={!allDone || busy}>
              {busy && <Spinner />} {busy ? "Saving…" : "Submit check-in"}
            </Button>
          </div>
        ) : (
          <Button type="button" variant={answered(q) ? "primary" : "secondary"} onClick={() => setI((n) => n + 1)} disabled={!answered(q)}>
            Next <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
      <p className="flex items-center justify-center gap-1 text-xs text-muted">
        <Lock className="size-3" /> Private
      </p>
    </section>
  );
}
