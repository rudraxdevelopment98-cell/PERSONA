"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Eye, Plus, Trash2, X } from "lucide-react";
import { BadgeIcon } from "./badge-icon";
import { Alert, Button, Input, cx } from "./ui";
import { COVERS, CAPTION_MAX, MOMENT_LABEL, REACTIONS, coverBg, momentFace, reactionEmoji, type MomentData, type MomentKind } from "@/lib/domain/moments";
import { cheerAction, nudgeAction, deleteMomentAction, momentOptionsAction, momentViewersAction, postMomentAction, viewMomentAction } from "@/app/(app)/friends/actions";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

export type FeedMoment = {
  id: string;
  kind: MomentKind;
  data: MomentData;
  cover: string;
  caption: string | null;
  created_at: string;
  seen: boolean;
  myReaction: string | null;
  views?: number;
};
export type FeedPerson = { id: string; name: string; avatar_emoji: string | null; cover: string | null; isMe: boolean; moments: FeedMoment[]; allSeen: boolean };

// ---------------------------------------------------------------------------
// Avatar with an optional moment ring
// ---------------------------------------------------------------------------

const SIZES = { xs: "size-7 text-sm", sm: "size-9 text-base", md: "size-12 text-xl", lg: "size-16 text-3xl", xl: "size-24 text-5xl" } as const;

export function FaceAvatar({
  name,
  emoji,
  cover,
  size = "md",
  ring = "none",
  className,
}: {
  name: string;
  emoji?: string | null;
  cover?: string | null;
  size?: keyof typeof SIZES;
  ring?: "none" | "new" | "seen";
  className?: string;
}) {
  const face = (
    <span
      className={cx("flex shrink-0 items-center justify-center rounded-full font-extrabold text-white", SIZES[size], !ring || ring === "none" ? className : undefined)}
      style={{ background: coverBg(cover) }}
      aria-hidden
    >
      {emoji ? <span className="drop-shadow-sm">{emoji}</span> : <span className="text-[0.6em]">{initials(name)}</span>}
    </span>
  );
  if (ring === "none") return face;
  return (
    <span
      className={cx("inline-flex shrink-0 rounded-full p-[2.5px]", className)}
      style={{ background: ring === "new" ? "conic-gradient(from 200deg,#f97316,#ec4899,#8b5cf6,#2dd4bf,#f97316)" : "var(--color-line-strong)" }}
    >
      <span className="rounded-full bg-bg p-[2px]">{face}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// The moment card itself (9:16)
// ---------------------------------------------------------------------------

export function MomentCard({
  kind,
  data,
  cover,
  caption,
  name,
  emoji,
  className,
  footer = true,
}: {
  kind: MomentKind;
  data: MomentData;
  cover: string;
  caption: string | null;
  name: string;
  emoji: string | null;
  className?: string;
  footer?: boolean;
}) {
  const f = momentFace(kind, data);
  // Sizes follow the card's width (container units), so a small preview looks like the full card.
  return (
    <div
      className={cx("relative flex aspect-[9/16] w-full flex-col overflow-hidden rounded-3xl text-white", className)}
      style={{ background: coverBg(cover), containerType: "inline-size" }}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-white/15 blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-16 -left-10 size-56 rounded-full bg-black/15 blur-2xl" aria-hidden />
      <div className="relative flex flex-1 flex-col items-center justify-center px-6 text-center">
        <span className="moment-sticker drop-shadow-md" style={{ fontSize: "16cqw" }}>
          {kind === "badge" && data.icon ? (
            <span className="flex items-center justify-center rounded-[22%] bg-white/20 backdrop-blur" style={{ width: "22cqw", height: "22cqw" }}>
              <BadgeIcon name={data.icon} className="size-1/2" />
            </span>
          ) : (
            f.sticker
          )}
        </span>
        <p className="font-black leading-none tracking-tight drop-shadow" style={{ fontSize: f.big.length > 10 ? "10cqw" : "22cqw", marginTop: "5cqw" }}>
          {f.big}
        </p>
        <p className="font-semibold text-white/90" style={{ fontSize: "5cqw", marginTop: "3cqw" }}>
          {f.line}
        </p>
        {caption && (
          <p className="max-w-[90%] rounded-2xl bg-black/25 font-medium backdrop-blur-sm" style={{ fontSize: "4.4cqw", marginTop: "6cqw", padding: "2.4cqw 4cqw" }}>
            {caption}
          </p>
        )}
      </div>
      {footer && (
        <div className="relative flex items-center justify-center gap-1.5 font-semibold text-white/80" style={{ fontSize: "3.2cqw", paddingBottom: "5cqw" }}>
          <span>{emoji ?? "✨"}</span> {name} · PERSONA 90
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rings row
// ---------------------------------------------------------------------------

export function MomentRings({
  feed,
  me,
  emptyHint = true,
}: {
  feed: FeedPerson[];
  me: { name: string; emoji: string | null; cover: string | null };
  emptyHint?: boolean;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const [compose, setCompose] = useState(false);
  const mine = feed.find((p) => p.isMe);
  const others = feed.filter((p) => !p.isMe);
  const order = mine ? [mine, ...others] : others;
  return (
    <div>
      <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="list" aria-label="Moments">
        <div role="listitem" className="flex w-16 shrink-0 flex-col items-center gap-1.5">
          <div className="relative">
            <button type="button" onClick={() => (mine ? setOpen(0) : setCompose(true))} aria-label={mine ? "View your moment" : "Share a moment"}>
              <FaceAvatar name={me.name} emoji={me.emoji} cover={me.cover} size="lg" ring={mine ? "seen" : "none"} />
            </button>
            <button
              type="button"
              onClick={() => setCompose(true)}
              aria-label="Share a moment"
              className="absolute -bottom-0.5 -right-0.5 flex size-6 items-center justify-center rounded-full border-2 border-bg bg-primary text-white"
            >
              <Plus className="size-3.5" strokeWidth={3} />
            </button>
          </div>
          <span className="w-full truncate text-center text-[11px] font-medium text-muted">You</span>
        </div>
        {others.map((p) => (
          <div key={p.id} role="listitem" className="w-16 shrink-0">
            <button
              type="button"
              onClick={() => setOpen(order.indexOf(p))}
              className="flex w-full flex-col items-center gap-1.5"
              aria-label={`${p.name}'s moments${p.allSeen ? "" : " (new)"}`}
            >
              <FaceAvatar name={p.name} emoji={p.avatar_emoji} cover={p.cover} size="lg" ring={p.allSeen ? "seen" : "new"} />
              <span className={cx("w-full truncate text-center text-[11px]", p.allSeen ? "text-muted" : "font-semibold")}>{p.name.split(" ")[0]}</span>
            </button>
          </div>
        ))}
        {emptyHint && others.length === 0 && (
          <p className="self-center text-xs leading-snug text-muted">
            Friends&apos; moments show up here for 24 hours.
            <br />
            Share yours with the <b>+</b>.
          </p>
        )}
      </div>
      {open !== null && <MomentViewer people={order} start={open} onClose={() => setOpen(null)} />}
      {compose && <MomentComposer me={me} onClose={() => setCompose(false)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Full-screen viewer
// ---------------------------------------------------------------------------

const DURATION = 5000;
const ago = (iso: string) => {
  const m = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60000));
  return m < 60 ? `${m}m` : `${Math.round(m / 60)}h`;
};

export function MomentViewer({ people, start, onClose }: { people: FeedPerson[]; start: number; onClose: () => void }) {
  const router = useRouter();
  const [p, setP] = useState(start);
  const [m, setM] = useState(() => Math.max(0, people[start].moments.findIndex((x) => !x.seen)));
  const [t, setT] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reacted, setReacted] = useState<Record<string, string>>({});
  const [viewers, setViewers] = useState<{ id: string; name: string; avatar_emoji: string | null; reaction: string | null }[] | null>(null);
  const [gone, setGone] = useState<Set<string>>(new Set());
  const seen = useRef(new Set<string>());
  const person = people[p];
  const list = person.moments.filter((x) => !gone.has(x.id));
  const moment = list[Math.min(m, list.length - 1)];

  const close = useCallback(() => {
    onClose();
    router.refresh();
  }, [onClose, router]);

  const next = useCallback(() => {
    setT(0);
    if (m < list.length - 1) setM(m + 1);
    else if (p < people.length - 1) {
      setP(p + 1);
      setM(Math.max(0, people[p + 1].moments.findIndex((x) => !x.seen)));
    } else close();
  }, [m, p, list.length, people, close]);

  const prev = () => {
    setT(0);
    if (m > 0) setM(m - 1);
    else if (p > 0) {
      setP(p - 1);
      setM(0);
    }
  };

  // Mark as seen once shown.
  useEffect(() => {
    if (!moment || person.isMe || seen.current.has(moment.id)) return;
    seen.current.add(moment.id);
    viewMomentAction(moment.id).catch(() => {});
  }, [moment, person.isMe]);

  // Progress timer.
  useEffect(() => {
    if (paused || viewers || !moment) return;
    const began = performance.now() - t * DURATION;
    let raf = 0;
    const tick = (now: number) => {
      const v = (now - began) / DURATION;
      if (v >= 1) return next();
      setT(v);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, viewers, moment?.id, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  });

  useEffect(() => {
    if (!moment) close();
  }, [moment, close]);
  if (!moment) return null;

  const react = (id: string) => {
    setReacted((r) => ({ ...r, [moment.id]: id }));
    viewMomentAction(moment.id, id).catch(() => {});
    setTimeout(next, 650);
  };
  const myReaction = reacted[moment.id] ?? moment.myReaction;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90" role="dialog" aria-modal="true" aria-label={`${person.name}'s moment`}>
      <div className="relative h-full w-full max-w-[440px] sm:h-[92vh] sm:py-0">
        <div className="absolute inset-x-3 top-3 z-20 flex gap-1">
          {list.map((x, i) => (
            <span key={x.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
              <span className="block h-full bg-white" style={{ width: `${i < m ? 100 : i === m ? t * 100 : 0}%` }} />
            </span>
          ))}
        </div>
        <div className="absolute inset-x-3 top-6 z-20 flex items-center gap-2 text-white">
          <FaceAvatar name={person.name} emoji={person.avatar_emoji} cover={person.cover} size="sm" />
          <span className="text-sm font-semibold">{person.name}</span>
          <span className="text-xs text-white/70">{ago(moment.created_at)} · {MOMENT_LABEL[moment.kind]}</span>
          <button type="button" onClick={close} aria-label="Close" className="ml-auto rounded-full p-2 hover:bg-white/10">
            <X className="size-5" />
          </button>
        </div>

        <div
          key={moment.id}
          className="animate-pop absolute inset-0 select-none p-0 sm:p-2"
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerLeave={() => setPaused(false)}
        >
          <MomentCard kind={moment.kind} data={moment.data} cover={moment.cover} caption={moment.caption} name={person.name} emoji={person.avatar_emoji} footer={false} className="h-full rounded-none sm:rounded-3xl" />
        </div>
        <button type="button" aria-label="Previous" onClick={prev} className="absolute inset-y-20 left-0 z-10 w-1/3" />
        <button type="button" aria-label="Next" onClick={next} className="absolute inset-y-20 right-0 z-10 w-2/3" />

        <div className="absolute inset-x-0 bottom-0 z-20 p-4">
          {person.isMe ? (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={async () => {
                  const r = await momentViewersAction(moment.id);
                  setViewers(r.error !== undefined ? [] : (r.viewers ?? []));
                }}
                className="flex items-center gap-1.5 rounded-full bg-black/35 px-4 py-2 text-sm font-semibold text-white backdrop-blur"
              >
                <Eye className="size-4" /> {moment.views ?? 0} saw it
              </button>
              <button
                type="button"
                aria-label="Delete this moment"
                onClick={async () => {
                  await deleteMomentAction(moment.id);
                  setGone((g) => new Set(g).add(moment.id));
                  if (list.length <= 1) close();
                }}
                className="rounded-full bg-black/35 p-2.5 text-white backdrop-blur"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              {REACTIONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => react(r.id)}
                  aria-label={`React ${r.emoji}`}
                  aria-pressed={myReaction === r.id}
                  className={cx(
                    "flex size-11 items-center justify-center rounded-full text-2xl backdrop-blur transition active:scale-125",
                    myReaction === r.id ? "scale-110 bg-white/90" : "bg-black/30 hover:bg-black/45",
                  )}
                >
                  {r.emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {viewers && (
          <div className="absolute inset-x-0 bottom-0 z-30 max-h-[60%] overflow-y-auto rounded-t-3xl bg-surface p-5 text-ink animate-rise">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-bold">Seen by {viewers.length}</p>
              <button type="button" onClick={() => setViewers(null)} aria-label="Close viewers" className="rounded-full p-1.5 hover:bg-bg">
                <X className="size-4" />
              </button>
            </div>
            {viewers.length === 0 && <p className="text-sm text-muted">No one yet. Friends will see it for 24 hours.</p>}
            <ul className="space-y-2">
              {viewers.map((v) => (
                <li key={v.id} className="flex items-center gap-3">
                  <FaceAvatar name={v.name} emoji={v.avatar_emoji} size="sm" />
                  <span className="flex-1 text-sm font-medium">{v.name}</span>
                  {v.reaction && <span className="text-xl">{reactionEmoji(v.reaction)}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// Composer
// ---------------------------------------------------------------------------

type Option = { kind: MomentKind; data: MomentData; hiddenFromFriends: boolean };

export function MomentComposer({ me: given, onClose, preferred }: { me?: { name: string; emoji: string | null; cover: string | null }; onClose: () => void; preferred?: MomentKind }) {
  const router = useRouter();
  const [options, setOptions] = useState<Option[] | null>(null);
  const [kind, setKind] = useState<MomentKind | null>(null);
  const [me, setMe] = useState(given ?? { name: "You", emoji: null as string | null, cover: null as string | null });
  const [cover, setCover] = useState<string>(given?.cover ?? "sunrise");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    momentOptionsAction().then((r) => {
      if (r.error !== undefined) return setError(r.error);
      const list = r.options ?? [];
      if (r.me) {
        setMe(r.me);
        if (!given) setCover(r.me.cover ?? "sunrise");
      }
      setOptions(list);
      setKind((list.find((o) => o.kind === preferred) ?? list[0])?.kind ?? null);
    });
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferred]);

  const chosen = options?.find((o) => o.kind === kind) ?? null;

  const post = () =>
    start(async () => {
      if (!kind) return;
      const r = await postMomentAction({ kind, cover, caption });
      if (r.error !== undefined) return setError(r.error);
      setDone(true);
      router.refresh();
      setTimeout(onClose, 900);
    });

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/60 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label="Share a moment">
      <div className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface p-5 shadow-raised animate-rise sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-lg font-extrabold">Share a moment</p>
            <p className="text-xs text-muted">Friends can see it for 24 hours. Only numbers, never your answers or journal.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-bg">
            <X className="size-5" />
          </button>
        </div>

        {error && <Alert tone="danger">{error}</Alert>}
        {options === null && !error && <div className="think-shimmer h-40 rounded-2xl bg-bg" />}
        {options && options.length === 0 && (
          <p className="rounded-2xl bg-bg p-4 text-sm text-muted">Finish today&apos;s check-in or episode and your first moment will be ready to share.</p>
        )}

        {options && options.length > 0 && chosen && (
          <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
            <div className="mx-auto w-40 sm:w-full">
              <MomentCard kind={chosen.kind} data={chosen.data} cover={cover} caption={caption.trim() || null} name={me.name} emoji={me.emoji} className="shadow-raised" />
            </div>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">What to share</p>
                <div className="flex flex-wrap gap-2">
                  {options.map((o) => (
                    <button
                      key={o.kind}
                      type="button"
                      onClick={() => setKind(o.kind)}
                      aria-pressed={kind === o.kind}
                      className={cx(
                        "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                        kind === o.kind ? "border-primary bg-primary text-white" : "border-line hover:bg-bg",
                      )}
                    >
                      {momentFace(o.kind, o.data).sticker} {MOMENT_LABEL[o.kind]}
                    </button>
                  ))}
                </div>
                {chosen.hiddenFromFriends && (
                  <p className="mt-2 text-xs text-warning">Your privacy settings hide this kind of progress, so only you will see it. Change it in Privacy.</p>
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Cover</p>
                <div className="flex flex-wrap gap-2">
                  {COVERS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCover(c.id)}
                      aria-label={c.label}
                      aria-pressed={cover === c.id}
                      className={cx("size-9 rounded-full ring-offset-2 ring-offset-surface transition", cover === c.id && "ring-2 ring-primary")}
                      style={{ background: c.bg }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="moment-caption" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
                  Caption (optional)
                </label>
                <Input id="moment-caption" value={caption} maxLength={CAPTION_MAX} onChange={(e) => setCaption(e.target.value)} placeholder="Aaj thoda darr laga, phir bhi bola 💪" />
              </div>
              <Button className="w-full" onClick={post} disabled={pending || done}>
                {done ? "Shared! ✨" : pending ? "Sharing…" : "Share moment"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// Small helpers for lists and profiles
// ---------------------------------------------------------------------------

/** One-tap cheer from a list row: tap 👋, pick an emoji. */
export function QuickCheer({ to, name, circleId = null }: { to: string; name: string; circleId?: string | null }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const send = (kind: string, emoji: string) =>
    start(async () => {
      const r = await cheerAction({ to, kind, circleId });
      setOpen(false);
      if (r.error !== undefined) {
        setErr(r.error);
        setTimeout(() => setErr(null), 2500);
      } else setSent(emoji);
    });
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        disabled={pending}
        aria-label={`Cheer ${name}`}
        className={cx("flex size-10 items-center justify-center rounded-full border border-line text-lg transition active:scale-90", sent ? "bg-accent-soft" : "bg-surface hover:bg-bg")}
      >
        {sent ?? "👋"}
      </button>
      {open && (
        <div className="animate-pop absolute right-0 top-11 z-20 flex gap-1 rounded-full border border-line bg-surface p-1 shadow-raised">
          {[
            ["fire", "🔥"],
            ["strong", "💪"],
            ["proud", "🌟"],
            ["clap", "👏"],
          ].map(([k, e]) => (
            <button key={k} type="button" onClick={() => send(k, e)} aria-label={`Send ${e}`} className="flex size-9 items-center justify-center rounded-full text-xl hover:bg-bg">
              {e}
            </button>
          ))}
        </div>
      )}
      {err && <p className="absolute right-0 top-11 z-20 w-48 rounded-xl bg-surface p-2 text-xs text-danger shadow-raised">{err}</p>}
    </div>
  );
}

/** Tapping a ringed avatar (or the button) opens that person's moments. */
export function WatchMoments({ person, children, className }: { person: FeedPerson; children: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className} aria-label={`Watch ${person.name}'s moments`}>
        {children}
      </button>
      {open && <MomentViewer people={[person]} start={0} onClose={() => setOpen(false)} />}
    </>
  );
}

/** "Share as a moment" button for places like the session-complete screen. */
export function ShareMomentButton({ preferred, className, children }: { preferred?: MomentKind; className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open && <MomentComposer preferred={preferred} onClose={() => setOpen(false)} />}
    </>
  );
}

/** "I'm done, your turn": nudge a friend who hasn't shown up today. */
export function NudgeButton({ to, name, variant = "icon" }: { to: string; name: string; variant?: "icon" | "pill" }) {
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const nudge = () =>
    start(async () => {
      const r = await nudgeAction(to);
      if (r.error !== undefined) {
        setState("error");
        setMsg(r.error);
        setTimeout(() => setMsg(null), 3000);
      } else setState("sent");
    });
  if (variant === "pill")
    return (
      <span className="inline-flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={nudge}
          disabled={pending || state === "sent"}
          className={cx("inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition active:scale-95", state === "sent" ? "bg-accent-soft text-accent" : "bg-ink text-bg")}
        >
          {state === "sent" ? "Nudged ✓" : `⏳ Nudge ${name.split(" ")[0]}`}
        </button>
        {msg && <span className="text-xs text-danger">{msg}</span>}
      </span>
    );
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={nudge}
        disabled={pending || state === "sent"}
        aria-label={`Nudge ${name}`}
        title={`Nudge ${name}`}
        className={cx("flex size-10 items-center justify-center rounded-full border text-lg transition active:scale-90", state === "sent" ? "border-accent bg-accent-soft" : "nudge-pulse border-warning bg-sun-soft")}
      >
        {state === "sent" ? "✓" : "⏳"}
      </button>
      {msg && <p className="absolute right-0 top-11 z-20 w-52 rounded-xl bg-surface p-2 text-xs text-danger shadow-raised">{msg}</p>}
    </div>
  );
}
