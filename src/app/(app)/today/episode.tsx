"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown, Clapperboard, Sparkles } from "lucide-react";
import { Badge, Card, cx } from "@/components/ui";
import { chooseNextWorld } from "./actions";

export type EpisodeInfo = {
  season: number;
  episode: number;
  finale: boolean;
  world: string;
  genre: string;
  previously: { episode: number; title?: string; summary: string }[];
  teaser: string | null;
  nextWorlds: { id: string; label: string }[];
  chosenWorld: string | null;
};

export function EpisodeTag({ info }: { info: EpisodeInfo }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
      <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-white">
        <Clapperboard className="size-3.5" /> Season {info.season} · Episode {info.episode}
      </span>
      {info.finale && <Badge tone="sun">Season finale</Badge>}
      <span className="rounded-full bg-bg px-2.5 py-1 text-muted">{info.world}</span>
      <span className="rounded-full bg-bg px-2.5 py-1 text-muted">{info.genre}</span>
    </div>
  );
}

export function Previously({ info }: { info: EpisodeInfo }) {
  const [open, setOpen] = useState(false);
  if (info.previously.length === 0) return null;
  const latest = info.previously[info.previously.length - 1];
  return (
    <Card className="border-dashed p-4">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 text-left" aria-expanded={open}>
        <span className="text-xs font-bold uppercase tracking-wider text-accent">Previously in Season {info.season}</span>
        <ChevronDown className={cx("size-4 text-muted transition-transform", open && "rotate-180")} />
      </button>
      {!open ? (
        <p className="mt-2 text-sm leading-relaxed text-muted">{latest.summary}</p>
      ) : (
        <ol className="mt-2 space-y-2">
          {info.previously.map((p) => (
            <li key={p.episode} className="text-sm leading-relaxed">
              <span className="font-semibold">Ep {p.episode}{p.title ? ` · ${p.title}` : ""}:</span> <span className="text-muted">{p.summary}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

/** Shown once today's session is done: a teaser for tomorrow, or a world choice after a finale. */
export function NextEpisode({ info }: { info: EpisodeInfo }) {
  const [chosen, setChosen] = useState<string | null>(info.chosenWorld);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!info.finale) {
    if (!info.teaser) return null;
    return (
      <Card className="bg-primary p-5 text-white">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-300">
          <Sparkles className="size-3.5" /> Tomorrow · Episode {info.episode + 1}
        </p>
        <p className="mt-2 font-serif text-lg leading-snug">{info.teaser}</p>
        <p className="mt-2 text-xs text-white/70">Come back tomorrow to find out what happens next.</p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent">
        <Sparkles className="size-3.5" /> Season {info.season} complete!
      </p>
      <p className="mt-1 font-bold">Choose the world for Season {info.season + 1}</p>
      <p className="text-sm text-muted">New characters, new place, new story - starting tomorrow.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {info.nextWorlds.map((w) => (
          <button
            key={w.id}
            type="button"
            disabled={pending}
            aria-pressed={chosen === w.id}
            onClick={() =>
              start(async () => {
                setError(null);
                const res = await chooseNextWorld(w.id);
                if (res.error) setError(res.error);
                else setChosen(w.id);
              })
            }
            className={cx(
              "flex items-center justify-between gap-2 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition",
              chosen === w.id ? "border-primary bg-primary-soft text-primary" : "border-line hover:bg-bg",
            )}
          >
            {w.label}
            {chosen === w.id && <Check className="size-4" />}
          </button>
        ))}
      </div>
      {chosen && !error && <p className="mt-2 text-xs font-semibold text-success">Saved - your next season starts there.</p>}
      {error && <p className="mt-2 text-xs font-semibold text-danger">{error}</p>}
    </Card>
  );
}
