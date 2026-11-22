"use client";

import { useState } from "react";
import { Share2, Vote } from "lucide-react";
import { FaceAvatar } from "./moments";
import { cx } from "./ui";
import type { PollView } from "@/lib/server/poll";

const LETTERS = ["A", "B", "C"];

/** "Aaj ka sawaal": vote in one tap, then see how everyone (and your friends) answered. */
export function DailyPoll({ initial }: { initial: PollView }) {
  const [poll, setPoll] = useState(initial);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const voted = poll.myChoice !== null;

  const vote = async (i: number) => {
    if (voted || busy !== null) return;
    setBusy(i);
    setError(null);
    try {
      const r = await fetch("/api/poll", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ choice: i }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setPoll(j.poll);
    } catch {
      setError("Vote save nahi hua. Dobara try karo.");
    } finally {
      setBusy(null);
    }
  };

  const pct = (i: number) => (poll.total ? Math.round((poll.counts[i] / poll.total) * 100) : 0);
  const share = async () => {
    const text = `Aaj ka sawaal: ${poll.question}\nTum kya karte? PERSONA 90 par vote karo.`;
    const url = `${location.origin}/`;
    if (navigator.share) await navigator.share({ title: "Aaj ka sawaal", text, url }).catch(() => {});
    else window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank", "noopener");
  };

  return (
    <section aria-label="Aaj ka sawaal" className="rounded-3xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent">
          <Vote className="size-4 shrink-0" />
          <span className="truncate">Aaj ka sawaal · {poll.skill}</span>
        </p>
        <span className="shrink-0 whitespace-nowrap text-[11px] text-muted">{voted ? "Kal naya" : "10 sec"}</span>
      </div>
      <p className="mt-2 text-[17px] font-bold leading-snug">{poll.question}</p>
      <div className="mt-3 space-y-2">
        {poll.options.map((o, i) => {
          const mine = poll.myChoice === i;
          return (
            <button
              key={i}
              type="button"
              disabled={voted || busy !== null}
              onClick={() => vote(i)}
              aria-pressed={mine}
              className={cx(
                "relative w-full overflow-hidden rounded-2xl border px-4 py-3 text-left text-sm transition",
                voted ? (mine ? "border-accent" : "border-line") : "border-line hover:border-primary active:scale-[0.99]",
                busy === i && "animate-pulse",
              )}
            >
              {voted && (
                <span
                  aria-hidden
                  className={cx("absolute inset-y-0 left-0 transition-[width] duration-700 ease-out", mine ? "bg-accent-soft" : "bg-bg")}
                  style={{ width: `${pct(i)}%` }}
                />
              )}
              <span className="relative flex items-start gap-3">
                <span className={cx("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", mine ? "bg-accent text-white" : "bg-bg text-muted")}>
                  {mine ? "✓" : LETTERS[i]}
                </span>
                <span className="min-w-0 flex-1">{o}</span>
                {voted && <span className="shrink-0 font-bold tabular-nums">{pct(i)}%</span>}
              </span>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      {voted && (
        <div className="animate-rise mt-4 space-y-3">
          <p className="text-xs text-muted">
            {poll.total <= 1 ? "Aaj sabse pehle tumne vote kiya! 🎉" : `${poll.total} logon ne vote kiya · ${pct(poll.myChoice!)}% tumhare saath`}
          </p>
          {poll.friendsSame.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {poll.friendsSame.map((f, i) => (
                  <FaceAvatar key={i} name={f.name} emoji={f.emoji} cover={f.cover} size="xs" className="ring-2 ring-surface" />
                ))}
              </div>
              <p className="text-xs">
                <b>{poll.friendsSame.map((f) => f.name.split(" ")[0]).join(", ")}</b> ne bhi yahi chuna
              </p>
            </div>
          )}
          <div className="rounded-2xl bg-bg p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">💡 Tip</p>
            <p className="mt-1 text-sm leading-relaxed">{poll.tip}</p>
          </div>
          <button type="button" onClick={share} className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
            <Share2 className="size-3.5" /> Doston se pucho
          </button>
        </div>
      )}
    </section>
  );
}
