"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { BadgeIcon } from "@/components/badge-icon";
import { FaceAvatar } from "@/components/moments";
import { Alert, Button, Card, Input, cx } from "@/components/ui";
import { AVATAR_EMOJIS, BIO_MAX, COVERS, MAX_PINNED, coverBg } from "@/lib/domain/moments";
import { saveProfileCardAction } from "../actions";

type Card_ = { avatar_emoji: string | null; cover: string; bio: string; pinned: string[] };

export function ProfileEditor({ name, initial, badges }: { name: string; initial: Card_; badges: { code: string; title: string; icon: string }[] }) {
  const router = useRouter();
  const [card, setCard] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (patch: Partial<Card_>) => setCard((c) => ({ ...c, ...patch }));
  const togglePin = (code: string) =>
    set({ pinned: card.pinned.includes(code) ? card.pinned.filter((c) => c !== code) : card.pinned.length >= MAX_PINNED ? card.pinned : [...card.pinned, code] });

  const save = () =>
    start(async () => {
      setError(null);
      const r = await saveProfileCardAction(card);
      if (r.error !== undefined) return setError(r.error);
      router.push("/friends");
      router.refresh();
    });

  return (
    <div className="space-y-4">
      {/* Live preview */}
      <section className="overflow-hidden rounded-3xl border border-line bg-surface" aria-label="Preview">
        <div className="h-24 transition-all duration-500" style={{ background: coverBg(card.cover) }} />
        <div className="-mt-12 flex flex-col items-center px-5 pb-5 text-center">
          <div className="rounded-full bg-surface p-1">
            <FaceAvatar name={name} emoji={card.avatar_emoji} cover={card.cover} size="xl" />
          </div>
          <p className="mt-2 text-xl font-extrabold">{name}</p>
          <p className="mt-1 min-h-5 text-sm text-muted">{card.bio || "Your one-liner shows here"}</p>
          {card.pinned.length > 0 && (
            <div className="mt-3 flex gap-2">
              {card.pinned.map((c) => {
                const b = badges.find((x) => x.code === c);
                return b ? (
                  <span key={c} className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent" title={b.title}>
                    <BadgeIcon name={b.icon} className="size-5" />
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>
      </section>

      <Card className="space-y-5 p-5">
        <div>
          <p className="mb-2 text-sm font-semibold">Avatar</p>
          <div className="grid grid-cols-9 gap-1.5 sm:grid-cols-12">
            {AVATAR_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => set({ avatar_emoji: e })}
                aria-label={`Avatar ${e}`}
                aria-pressed={card.avatar_emoji === e}
                className={cx("flex aspect-square items-center justify-center rounded-xl text-xl transition", card.avatar_emoji === e ? "scale-110 bg-primary-soft ring-2 ring-primary" : "hover:bg-bg")}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">Cover</p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {COVERS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => set({ cover: c.id })}
                aria-pressed={card.cover === c.id}
                className={cx("relative h-12 rounded-xl ring-offset-2 ring-offset-surface", card.cover === c.id && "ring-2 ring-primary")}
                style={{ background: c.bg }}
              >
                <span className="sr-only">{c.label}</span>
                {card.cover === c.id && <Check className="absolute inset-0 m-auto size-5 text-white" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="bio" className="mb-2 block text-sm font-semibold">
            One-liner
          </label>
          <Input id="bio" value={card.bio} maxLength={BIO_MAX} onChange={(e) => set({ bio: e.target.value })} placeholder="Learning to speak up in class 🎤" />
          <p className="mt-1 text-right text-xs text-muted">
            {card.bio.length}/{BIO_MAX}
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold">Pin up to {MAX_PINNED} badges</p>
          <p className="mb-2 text-xs text-muted">Friends who can see your badges see these on your trophy shelf.</p>
          {badges.length === 0 ? (
            <p className="rounded-2xl bg-bg p-3 text-sm text-muted">Earn your first badge by finishing a check-in.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => {
                const on = card.pinned.includes(b.code);
                return (
                  <button
                    key={b.code}
                    type="button"
                    onClick={() => togglePin(b.code)}
                    aria-pressed={on}
                    className={cx("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm", on ? "border-primary bg-primary-soft font-semibold text-primary" : "border-line hover:bg-bg")}
                  >
                    <BadgeIcon name={b.icon} className="size-4" /> {b.title}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && <Alert tone="danger">{error}</Alert>}
        <Button className="w-full" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </Card>
    </div>
  );
}
