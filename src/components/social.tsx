"use client";

import { focusLabel } from "@/lib/domain/programme";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Award, Bell, BellOff, Check, Copy, Flame, MoreHorizontal, Share2, ShieldBan, Trophy, UserMinus, Flag as FlagIcon } from "lucide-react";
import type { SharedView } from "@/lib/domain/social";
import {
  blockAction,
  cheerAction,
  createInviteAction,
  removeFriendAction,
  removePushAction,
  reportAction,
} from "@/app/(app)/friends/actions";
import { Alert, Button, Card, Input, Select, cx } from "./ui";
import { FaceAvatar } from "./moments";
import { enablePush, pushState } from "@/lib/client/push";
import { VoiceTextarea } from "@/components/voice-input";
import { useT } from "@/lib/i18n/client";

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?"
  );
}

const AVATAR_TONES = ["bg-primary-soft text-primary", "bg-accent-soft text-accent", "bg-coral-soft text-coral", "bg-sky-soft text-sky", "bg-sun-soft text-warning"];

export function Avatar({ name, id, size = "md", emoji, cover }: { name: string; id: string; size?: "sm" | "md" | "lg"; emoji?: string | null; cover?: string | null }) {
  if (emoji || cover) return <FaceAvatar name={name} emoji={emoji} cover={cover} size={size === "sm" ? "sm" : size === "lg" ? "lg" : "md"} />;
  const tone = AVATAR_TONES[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  const s = { sm: "size-8 text-xs", md: "size-11 text-sm", lg: "size-14 text-base" }[size];
  return <span className={cx("flex shrink-0 items-center justify-center rounded-full font-extrabold", s, tone)}>{initials(name)}</span>;
}

// ---------------------------------------------------------------------------
// Invite
// ---------------------------------------------------------------------------

export function InviteBox({ kind = "friend", circleId = null, title, text }: { kind?: "friend" | "circle"; circleId?: string | null; title: string; text: string }) {
  const t = useT();
  const [url, setUrl] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const create = () =>
    start(async () => {
      setError(null);
      const res = await createInviteAction({ kind, circleId });
      if (res.error !== undefined) return setError(res.error);
      setUrl(res.url!);
      setQr(await QRCode.toDataURL(res.url!, { margin: 1, width: 220 }));
    });

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const share = async () => {
    if (!url) return;
    const message = kind === "circle" ? "Join my circle on PERSONA 90 - let's grow together" : "Join me on PERSONA 90 - let's keep each other on track";
    if (navigator.share) await navigator.share({ title: "PERSONA 90", text: message, url }).catch(() => {});
    else window.open(`https://wa.me/?text=${encodeURIComponent(`${message}: ${url}`)}`, "_blank", "noopener");
  };

  return (
    <Card className="p-5">
      <p className="font-bold">{t(title)}</p>
      <p className="mt-0.5 text-sm text-muted">{text}</p>
      {error && <div className="mt-3"><Alert tone="danger">{t(error)}</Alert></div>}
      {!url ? (
        <Button className="mt-4" onClick={create} disabled={pending}>
          <Share2 className="size-4" /> {pending ? t("Creating...") : t("Create invite link")}
        </Button>
      ) : (
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          {qr && <img src={qr} alt={t("Invite QR code")} className="size-36 rounded-xl border border-line bg-white p-1" />}
          <div className="min-w-0 flex-1 space-y-2">
            <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label={t("Invite link")} />
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={copy}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? t("Copied") : t("Copy")}
              </Button>
              <Button onClick={share}>
                <Share2 className="size-4" />{" "}{t("Share")}</Button>
            </div>
            <p className="text-xs text-muted">{t("Works for up to 5 people, expires in 7 days. Anyone who opens it can connect with you.")}</p>
          </div>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Shared progress tile
// ---------------------------------------------------------------------------

export function ProgressTile({
  view,
  week,
  compact,
}: {
  view: SharedView;
  week?: { sessions: number; checkins: number; challenges: number } | null;
  compact?: boolean;
}) {
  const t = useT();
  const has = (i: string) => view.shared.includes(i as never);
  const nothing = view.shared.length === 0;
  return (
    <div className="space-y-3">
      {nothing && <p className="text-sm text-muted">{t("Not sharing any progress right now.")}</p>}
      <div className="flex flex-wrap gap-2 text-xs font-semibold">
        {has("activity") && (
          <>
            <span className="inline-flex items-center gap-1 rounded-full bg-sun-soft px-2.5 py-1 text-warning">
              <Flame className="size-3.5" /> {view.streak}{" "}{t("day streak")}</span>
            <span className="rounded-full bg-bg px-2.5 py-1 text-muted">{view.programme_day ? t("Day {0}/90", view.programme_day) : t("Not started")}</span>
          </>
        )}
        {has("xp") && <span className="rounded-full bg-primary-soft px-2.5 py-1 text-primary">{t("Lv {0} · {1} XP", view.level ?? "", view.xp ?? "")}</span>}
        {has("challenges") && <span className="rounded-full bg-coral-soft px-2.5 py-1 text-coral">{t("{0} challenges", view.challenges_completed ?? "")}</span>}
      </div>
      {has("activity") && week && !compact && (
        <p className="text-xs text-muted">{t("This week:")}{" "}<b className="text-ink">{week.sessions}</b>{" "}{t("sessions ·")}{" "}<b className="text-ink">{week.checkins}</b>{" "}{t("check-ins ·")}{" "}<b className="text-ink">{week.challenges}</b>{" "}{t("challenges")}</p>
      )}
      {has("focus") && view.focus && <p className="text-xs text-muted">{t("Today's focus:")}{" "}<b className="text-ink">{t(focusLabel(view.focus.title))}</b></p>}
      {has("badges") && view.badges && view.badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {view.badges.slice(0, compact ? 3 : 8).map((b) => (
            <span key={b.code} className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-muted">
              <Award className="size-3 text-accent" /> {t(b.title)}
            </span>
          ))}
          {compact && view.badges.length > 3 && <span className="text-[11px] text-muted">+{view.badges.length - 3}</span>}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cheers
// ---------------------------------------------------------------------------

const QUICK = [
  { kind: "fire", emoji: "🔥", label: "Keep it up" },
  { kind: "strong", emoji: "💪", label: "You've got this" },
  { kind: "proud", emoji: "🌟", label: "Proud of you" },
  { kind: "clap", emoji: "👏", label: "Well done" },
];

export function CheerBar({ to, circleId = null }: { to: string; circleId?: string | null }) {
  const t = useT();
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const send = (kind: string, text?: string) =>
    start(async () => {
      const res = await cheerAction({ to, kind, note: text ?? null, circleId });
      if (res.error !== undefined) setMsg({ tone: "danger", text: res.error });
      else {
        setMsg({ tone: "success", text: "Cheer sent!" });
        setNote("");
        setOpen(false);
      }
      setTimeout(() => setMsg(null), 2500);
    });
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {QUICK.map((q) => (
          <button
            key={q.kind}
            type="button"
            title={t(q.label)}
            aria-label={t("Send cheer: {0}", q.label)}
            disabled={pending}
            onClick={() => send(q.kind)}
            className="flex size-9 items-center justify-center rounded-full border border-line bg-surface text-lg transition hover:-translate-y-0.5 hover:bg-bg disabled:opacity-50"
          >
            {q.emoji}
          </button>
        ))}
        <button type="button" onClick={() => setOpen((o) => !o)} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:bg-bg">{t("💬 Note")}</button>
      </div>
      {open && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send("note", note);
          }}
        >
          <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} placeholder={t("Short encouragement (140 chars)")} aria-label={t("Cheer message")} />
          <Button disabled={pending || !note.trim()}>{t("Send")}</Button>
        </form>
      )}
      {msg && <p className={cx("text-xs font-semibold", msg.tone === "success" ? "text-success" : "text-danger")}>{msg.text}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Friend menu: remove / block / report
// ---------------------------------------------------------------------------

export function FriendMenu({ userId, name }: { userId: string; name: string }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "report">("menu");
  const [reason, setReason] = useState("Inappropriate message");
  const [details, setDetails] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const act = (fn: () => Promise<{ error?: string }>, confirmText: string) => {
    if (!confirm(confirmText)) return;
    start(async () => {
      const res = await fn();
      if (res.error) setMsg(res.error);
      else {
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <div className="relative">
      <button type="button" aria-label={t("Options for {0}", name)} onClick={() => setOpen((o) => !o)} className="rounded-lg p-1.5 text-muted hover:bg-bg hover:text-ink">
        <MoreHorizontal className="size-5" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-64 rounded-xl border border-line bg-surface p-2 shadow-raised">
          {mode === "menu" ? (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => act(() => removeFriendAction(userId), `Remove ${name} as a friend? You'll stop seeing each other's progress.`)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-bg"
              >
                <UserMinus className="size-4" />{" "}{t("Remove friend")}</button>
              <button
                type="button"
                disabled={pending}
                onClick={() => act(() => blockAction(userId), `Block ${name}? They won't see anything about you, can't cheer you or race with you, and you won't see them.`)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-danger hover:bg-danger-soft"
              >
                <ShieldBan className="size-4" />{" "}{t("Block")}</button>
              <button type="button" onClick={() => setMode("report")} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-bg">
                <FlagIcon className="size-4" />{" "}{t("Report")}</button>
            </>
          ) : (
            <form
              className="space-y-2 p-1"
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  const res = await reportAction({ userId, reason, details });
                  setMsg(res.error ?? "Thanks - your report was sent.");
                  if (!res.error) setMode("menu");
                });
              }}
            >
              <Select value={reason} onChange={(e) => setReason(e.target.value)} aria-label={t("Reason")}>
                <option>{t("Inappropriate message")}</option>
                <option>{t("Harassment or bullying")}</option>
                <option>{t("Spam")}</option>
                <option>{t("Fake account")}</option>
                <option>{t("Other")}</option>
              </Select>
              <VoiceTextarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} placeholder={t("Details (optional)")} className="min-h-16" />
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setMode("menu")}>{t("Back")}</Button>
                <Button disabled={pending}>{t("Send report")}</Button>
              </div>
            </form>
          )}
          {msg && <p className="px-2.5 pt-1 text-xs text-muted">{t(msg)}</p>}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Push notifications
// ---------------------------------------------------------------------------

export function PushToggle() {
  const t = useT();
  const [state, setState] = useState<"loading" | "unsupported" | "denied" | "off" | "on">("loading");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    pushState()
      .then(setState)
      .catch(() => setState("unsupported"));
  }, []);

  const enable = () =>
    start(async () => {
      setError(null);
      const r = await enablePush();
      setState(r.state);
      if (r.error) setError(r.error);
    });

  const disable = () =>
    start(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    });

  if (state === "loading") return null;
  return (
    <div className="space-y-2">
      {state === "unsupported" && <p className="text-sm text-muted">{t("This browser doesn't support notifications. On iPhone, add PERSONA 90 to your Home Screen to enable them.")}</p>}
      {state === "denied" && <p className="text-sm text-muted">{t("Notifications are blocked for this site. Allow them in your browser's site settings.")}</p>}
      {state === "off" && (
        <Button variant="secondary" onClick={enable} disabled={pending}>
          <Bell className="size-4" />{" "}{t("Turn on notifications")}</Button>
      )}
      {state === "on" && (
        <Button variant="ghost" onClick={disable} disabled={pending}>
          <BellOff className="size-4" />{" "}{t("Turn off notifications on this device")}</Button>
      )}
      {error && <Alert tone="danger">{t(error)}</Alert>}
    </div>
  );
}

export function RankBadge({ rank }: { rank: number }) {
  const tone = rank === 1 ? "bg-sun-soft text-warning" : rank === 2 ? "bg-bg text-ink" : rank === 3 ? "bg-coral-soft text-coral" : "bg-bg text-muted";
  return (
    <span className={cx("flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold", tone)}>
      {rank === 1 ? <Trophy className="size-4" /> : rank}
    </span>
  );
}
