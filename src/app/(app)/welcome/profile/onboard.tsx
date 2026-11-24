"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, AtSign, Check, Globe, Lock } from "lucide-react";
import { Alert, Button, Spinner, cx } from "@/components/ui";
import { useT } from "@/lib/i18n/client";
import { DEFAULT_PUBLIC_ITEMS, PUBLIC_ITEMS, type PublicItem, USERNAME_RE } from "@/lib/domain/profile";
import { checkUsernameAction, saveDiscoveryAction } from "../../discover-actions";

export function OnboardProfile({ current }: { current: { username: string | null; isPublic: boolean; items: PublicItem[]; bio: string } }) {
  const t = useT();
  const router = useRouter();
  const [username, setUsername] = useState(current.username ?? "");
  const [isPublic, setIsPublic] = useState(current.isPublic);
  const [items, setItems] = useState<PublicItem[]>(current.items.length ? current.items : DEFAULT_PUBLIC_ITEMS);
  const [avail, setAvail] = useState<{ ok: boolean; error?: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const seq = useRef(0);

  const handle = username.trim().toLowerCase();
  useEffect(() => {
    if (!USERNAME_RE.test(handle)) {
      setAvail(null);
      setChecking(false);
      return;
    }
    setChecking(true);
    const id = ++seq.current;
    const tmr = setTimeout(async () => {
      const r = await checkUsernameAction(handle);
      if (id === seq.current) {
        setAvail(r);
        setChecking(false);
      }
    }, 350);
    return () => clearTimeout(tmr);
  }, [handle]);

  const toggleItem = (id: PublicItem) => setItems((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));

  const go = (makePublic: boolean) =>
    start(async () => {
      setError(null);
      const r = await saveDiscoveryAction({ username: handle || undefined, isPublic: makePublic, items });
      if (r.error) setError(r.error);
      else router.push("/dashboard");
    });

  const canContinue = !checking && (!handle || avail?.ok !== false);

  return (
    <div className="mt-5 space-y-5">
      <div>
        <label htmlFor="ob-username" className="text-sm font-medium">{t("Username")}</label>
        <div className="relative mt-1">
          <AtSign className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            id="ob-username"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
            maxLength={20}
            placeholder="riya_patel"
            className="h-11 w-full rounded-lg border border-line bg-surface pl-9 pr-10 text-sm outline-none focus:border-primary"
          />
          {checking && <Spinner className="absolute right-3 top-1/2 -translate-y-1/2" />}
          {!checking && avail?.ok && <Check className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-accent" />}
        </div>
        {avail?.error && <p className="mt-1 text-xs text-danger">{t(avail.error)}</p>}
        {avail?.ok && <p className="mt-1 text-xs text-accent">{t("Available!")}</p>}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setIsPublic(false)}
          className={cx("rounded-2xl border-2 p-4 text-left transition", !isPublic ? "border-primary bg-primary-soft" : "border-line hover:border-line-strong")}
        >
          <Lock className="size-5 text-muted" />
          <p className="mt-2 font-bold">{t("Private")}</p>
          <p className="text-xs text-muted">{t("Only friends you accept see your profile. Not shown in search.")}</p>
        </button>
        <button
          type="button"
          onClick={() => setIsPublic(true)}
          className={cx("rounded-2xl border-2 p-4 text-left transition", isPublic ? "border-primary bg-primary-soft" : "border-line hover:border-line-strong")}
        >
          <Globe className="size-5 text-primary" />
          <p className="mt-2 font-bold">{t("Public")}</p>
          <p className="text-xs text-muted">{t("People can find you by @username and see what you choose.")}</p>
        </button>
      </div>

      {isPublic && (
        <div className="rounded-xl border border-line p-3">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">{t("Show publicly")}</p>
          <p className="mb-2 text-xs text-muted">{t("Your name and avatar are always shown.")}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {PUBLIC_ITEMS.map((it) => (
              <label key={it.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={items.includes(it.id)} onChange={() => toggleItem(it.id)} />
                {t(it.label)}
              </label>
            ))}
          </div>
        </div>
      )}

      {isPublic && !handle && <Alert tone="warning">{t("Pick a username to make your profile public.")}</Alert>}
      {error && <Alert tone="danger">{t(error)}</Alert>}

      <div className="flex items-center justify-between gap-3">
        <button type="button" className="text-sm font-semibold text-muted hover:text-ink" disabled={pending} onClick={() => go(false)}>
          {t("Skip for now")}
        </button>
        <Button disabled={pending || !canContinue || (isPublic && !handle)} onClick={() => go(isPublic)}>
          {pending ? <Spinner /> : null} {t("Continue")} <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
