"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, Check, Layers, Share2, X } from "lucide-react";
import { Button, cx } from "@/components/ui";
import type { CardsView } from "@/lib/server/cards";

type Answer = CardsView["answers"][number];

/** Five cards, one at a time: tap or swipe (left = A, right = B), the card flips to show the stronger move. */
export function CardDeck({ initial }: { initial: CardsView }) {
  const [answers, setAnswers] = useState<Answer[]>(initial.answers);
  const firstOpen = initial.cards.findIndex((_, i) => !initial.answers.some((a) => a.idx === i));
  const [i, setI] = useState(firstOpen === -1 ? initial.cards.length : firstOpen);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null);
  const total = initial.cards.length;
  const card = initial.cards[i];
  const answer = answers.find((a) => a.idx === i);
  const right = answers.filter((a) => a.correct).length;

  const pick = async (choice: "a" | "b") => {
    if (busy || answer) return;
    setBusy(true);
    try {
      const r = await fetch("/api/cards", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idx: i, choice }) });
      const j = await r.json();
      if (r.ok) setAnswers((xs) => [...xs.filter((x) => x.idx !== i), j.answer]);
    } finally {
      setBusy(false);
      setDrag(0);
    }
  };

  const onDown = (e: React.PointerEvent) => {
    if (answer) return;
    start.current = e.clientX;
  };
  const onMove = (e: React.PointerEvent) => {
    if (start.current !== null) setDrag(e.clientX - start.current);
  };
  const onUp = () => {
    if (start.current === null) return;
    start.current = null;
    if (drag < -90) pick("a");
    else if (drag > 90) pick("b");
    else setDrag(0);
  };

  const share = async () => {
    const text = `Aaj ke PERSONA 90 quick cards: ${right}/${total} sahi 🎯 Tum kitne karoge?`;
    if (navigator.share) await navigator.share({ title: "Quick cards", text, url: location.origin }).catch(() => {});
    else window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${location.origin}`)}`, "_blank", "noopener");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent">
            <Layers className="size-4" /> Quick cards
          </p>
          <h1 className="text-xl font-extrabold">5 situations · 1 minute</h1>
        </div>
        {initial.streak > 0 && <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent">🔥 {initial.streak} din</span>}
      </div>

      <div className="flex gap-1.5" aria-label={`Card ${Math.min(i + 1, total)} of ${total}`}>
        {initial.cards.map((_, k) => {
          const a = answers.find((x) => x.idx === k);
          return <span key={k} className={cx("h-1.5 flex-1 rounded-full", a ? (a.correct ? "bg-accent" : "bg-primary/40") : k === i ? "bg-primary" : "bg-line")} />;
        })}
      </div>

      {card ? (
        <div className="relative" style={{ perspective: "1200px" }}>
          {!answer ? (
            <div
              key={`front-${i}`}
              className="bg-brand animate-step-in flex min-h-[400px] touch-pan-y select-none flex-col rounded-[28px] p-6 text-white shadow-raised transition-transform"
              style={{ transform: `translateX(${drag}px) rotate(${drag / 25}deg)` }}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-white/70">{card.skill}</p>
              <p className="mt-4 font-serif text-[22px] leading-snug">{card.situation}</p>
              <div className="mt-auto grid gap-2 pt-6">
                {(["a", "b"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    disabled={busy}
                    onClick={() => pick(k)}
                    className={cx(
                      "flex items-start gap-3 rounded-2xl bg-white/10 px-4 py-3 text-left text-[15px] backdrop-blur transition active:scale-[0.98]",
                      (k === "a" && drag < -40) || (k === "b" && drag > 40) ? "bg-white/30 ring-2 ring-white" : "hover:bg-white/15",
                    )}
                  >
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-primary">{k.toUpperCase()}</span>
                    <span>{card[k]}</span>
                  </button>
                ))}
                <p className="text-center text-[11px] text-white/60">← swipe for A · B ke liye swipe →</p>
              </div>
            </div>
          ) : (
            <div key={`back-${i}`} className="card-flip-in flex min-h-[400px] flex-col rounded-[28px] border border-line bg-surface p-6 shadow-raised">
              <span className={cx("flex size-12 items-center justify-center rounded-full", answer.correct ? "bg-accent text-white" : "bg-primary-soft text-primary")}>
                {answer.correct ? <Check className="size-6" strokeWidth={3} /> : <X className="size-6" strokeWidth={3} />}
              </span>
              <p className="mt-3 text-lg font-extrabold">{answer.correct ? "Sahi pakda! 🎯" : "Is baar dusra wala behtar tha"}</p>
              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted">Stronger move · {answer.better.toUpperCase()}</p>
              <p className="mt-1 text-[15px] font-semibold">{card[answer.better]}</p>
              <p className="mt-4 text-[15px] leading-relaxed text-muted">{answer.why}</p>
              <Button className="mt-auto w-full" onClick={() => setI(i + 1)}>
                {i + 1 < total ? "Next card" : "See result"} <ArrowRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="animate-pop rounded-[28px] border border-line bg-surface p-6 text-center shadow-raised">
          <p className="text-5xl font-black tabular-nums">
            {right}/{total}
          </p>
          <p className="mt-2 text-lg font-extrabold">{right === total ? "Perfect! Sab sahi 🏆" : right >= 3 ? "Badhiya! 💪" : "Practice se hi aata hai 🌱"}</p>
          <p className="mt-1 text-sm text-muted">Kal 5 naye cards. Roz ek minute, aur sahi move apne aap aane lagega.</p>
          <div className="mt-5 grid gap-2">
            <Button variant="secondary" onClick={share}>
              <Share2 className="size-4" /> Doston ko challenge karo
            </Button>
            <Link href="/dashboard" className="text-sm font-semibold text-primary">
              Home par wapas
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
