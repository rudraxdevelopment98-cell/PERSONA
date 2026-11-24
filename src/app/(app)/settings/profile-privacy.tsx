"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AtSign, Check, ExternalLink, Globe, Lock } from "lucide-react";
import { Alert, Button, Card, CardHeader, Label, Spinner, cx } from "@/components/ui";
import { useT } from "@/lib/i18n/client";
import { PUBLIC_ITEMS, type PublicItem, USERNAME_RE } from "@/lib/domain/profile";
import { checkUsernameAction, saveDiscoveryAction } from "../discover-actions";

export function ProfilePrivacy({ current }: { current: { username: string | null; isPublic: boolean; items: PublicItem[]; bio: string } }) {
  const t = useT();
  const router = useRouter();
  const [username, setUsername] = useState(current.username ?? "");
  const [isPublic, setIsPublic] = useState(current.isPublic);
  const [items, setItems] = useState<PublicItem[]>(current.items);
  const [bio, setBio] = useState(current.bio);
  const [avail, setAvail] = useState<{ ok: boolean; error?: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const seq = useRef(0);

  const changed = username.trim().toLowerCase() !== (current.username ?? "");
  useEffect(() => {
    const h = username.trim().toLowerCase();
    if (!changed || !USERNAME_RE.test(h)) {
      setAvail(null);
      setChecking(false);
      return;
    }
    setChecking(true);
    const id = ++seq.current;
    const tmr = setTimeout(async () => {
      const r = await checkUsernameAction(h);
      if (id === seq.current) {
        setAvail(r);
        setChecking(false);
      }
    }, 350);
    return () => clearTimeout(tmr);
  }, [username, changed]);

  const toggleItem = (id: PublicItem) => setItems((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));

  const save = () =>
    start(async () => {
      setMsg(null);
      const r = await saveDiscoveryAction({ username: username.trim().toLowerCase() || undefined, isPublic, items, bio });
      if (r.error) setMsg({ tone: "danger", text: r.error });
      else {
        setMsg({ tone: "success", text: t("Saved.") });
        router.refresh();
      }
    });

  return (
    <Card className="mb-6">
      <CardHeader title={t("Profile & privacy")} description={t("Your username, and what other people can see about you.")} />
      <div className="space-y-5 px-5 pb-5">
        <div>
          <Label htmlFor="username">{t("Username")}</Label>
          <div className="relative mt-1">
            <AtSign className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
              maxLength={20}
              placeholder="riya_patel"
              className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-10 text-sm outline-none focus:border-primary"
            />
            {checking && <Spinner className="absolute right-3 top-1/2 -translate-y-1/2" />}
            {!checking && avail?.ok && <Check className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-accent" />}
          </div>
          {changed && avail?.error && <p className="mt-1 text-xs text-danger">{t(avail.error)}</p>}
          {changed && avail?.ok && <p className="mt-1 text-xs text-accent">{t("Available!")}</p>}
          {!changed && current.username && (
            <Link href={`/u/${current.username}`} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              {t("View my public profile")} <ExternalLink className="size-3" />
            </Link>
          )}
        </div>

        <div className="rounded-xl border border-line p-3">
          <div className="flex items-start gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              onClick={() => setIsPublic((v) => !v)}
              className={cx("mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors", isPublic ? "bg-primary" : "bg-line")}
            >
              <span className={cx("size-5 rounded-full bg-white transition-transform", isPublic && "translate-x-5")} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                {isPublic ? <Globe className="size-4 text-primary" /> : <Lock className="size-4 text-muted" />}
                {isPublic ? t("Public profile") : t("Private profile")}
              </p>
              <p className="text-xs text-muted">
                {isPublic ? t("Anyone can find you by @username and see the parts you choose below.") : t("Only friends you accept can see your profile. You won't appear in search.")}
              </p>
            </div>
          </div>

          {isPublic && (
            <div className="mt-4 border-t border-line pt-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">{t("Show publicly")}</p>
              <p className="mb-2 text-xs text-muted">{t("Your name and avatar are always shown.")}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {PUBLIC_ITEMS.map((it) => (
                  <label key={it.id} className="flex items-start gap-2 text-sm">
                    <input type="checkbox" className="mt-0.5 size-4 accent-[var(--color-primary)]" checked={items.includes(it.id)} onChange={() => toggleItem(it.id)} />
                    <span>
                      {t(it.label)}
                      <span className="block text-xs text-muted">{t(it.hint)}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="bio">{t("Bio")}</Label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={160}
            rows={2}
            placeholder={t("One line about you (optional)")}
            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <Button disabled={pending || checking || (changed && avail != null && !avail.ok)} onClick={save}>
          {pending && <Spinner />} {t("Save profile")}
        </Button>
      </div>
    </Card>
  );
}
