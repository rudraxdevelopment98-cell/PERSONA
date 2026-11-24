"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Search, UserPlus, X } from "lucide-react";
import { FaceAvatar } from "./moments";
import { Button, Spinner, cx } from "./ui";
import { useT } from "@/lib/i18n/client";
import type { PersonResult } from "@/lib/server/discover";
import type { FriendState } from "@/lib/server/social";
import { cancelRequestAction, respondRequestAction, searchUsersAction, sendRequestAction } from "@/app/(app)/discover-actions";

/** A connect / requested / accept button that reflects the relationship. */
export function ConnectButton({ otherId, state: initial, compact }: { otherId: string; state: FriendState; compact?: boolean }) {
  const t = useT();
  const [state, setState] = useState<FriendState>(initial);
  const [pending, start] = useTransition();
  const act = (fn: () => Promise<{ error?: string }>, next: FriendState) =>
    start(async () => {
      const r = await fn();
      if (!r?.error) setState(next);
    });

  if (state === "self" || state === "blocked") return null;
  if (state === "friends") return <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent"><Check className="size-4" /> {t("Friends")}</span>;
  if (state === "pending_out")
    return (
      <Button variant="secondary" className={cx(compact && "h-8 px-3")} disabled={pending} onClick={() => act(() => cancelRequestAction(otherId), "none")}>
        {pending ? <Spinner /> : t("Requested")}
      </Button>
    );
  if (state === "pending_in")
    return (
      <div className="flex items-center gap-1.5">
        <Button className={cx(compact && "h-8 px-3")} disabled={pending} onClick={() => act(() => respondRequestAction(otherId, true), "friends")}>
          {pending ? <Spinner /> : t("Accept")}
        </Button>
        <button type="button" aria-label={t("Decline")} disabled={pending} onClick={() => act(() => respondRequestAction(otherId, false), "none")} className="rounded-lg p-1.5 text-muted hover:bg-bg">
          <X className="size-4" />
        </button>
      </div>
    );
  return (
    <Button variant="secondary" className={cx(compact && "h-8 px-3")} disabled={pending} onClick={() => act(() => sendRequestAction(otherId), "pending_out")}>
      {pending ? <Spinner /> : <><UserPlus className="size-4" /> {t("Add")}</>}
    </Button>
  );
}

export function PersonRow({ p }: { p: PersonResult }) {
  const t = useT();
  return (
    <div className="flex items-center gap-3 py-3">
      <Link href={`/u/${p.username}`} className="shrink-0">
        <FaceAvatar name={p.name} emoji={p.avatar_emoji} cover={p.cover} size="md" />
      </Link>
      <Link href={`/u/${p.username}`} className="min-w-0 flex-1">
        <p className="truncate font-semibold">{p.name}</p>
        <p className="truncate text-xs text-muted">
          @{p.username}
          {p.reason ? ` · ${t(p.reason)}` : p.streak > 0 ? ` · 🔥 ${p.streak}` : p.level > 1 ? ` · ${t("Level {0}", p.level)}` : ""}
        </p>
      </Link>
      <ConnectButton otherId={p.id} state={p.isFriend ? "friends" : "none"} compact />
    </div>
  );
}

/** Live search by name or @username. */
export function UserSearch() {
  const t = useT();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PersonResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = ++seq.current;
    const h = setTimeout(async () => {
      const r = await searchUsersAction(term);
      if (id === seq.current) {
        setResults(r.error ? [] : (r.results ?? []));
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(h);
  }, [query]);

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Search by name or @username")}
          className="h-11 w-full rounded-full border border-line bg-surface pl-10 pr-4 text-sm outline-none focus:border-primary"
          aria-label={t("Search people")}
        />
        {loading && <Spinner className="absolute right-4 top-1/2 -translate-y-1/2" />}
      </div>
      {results != null && (
        <div className="mt-2 divide-y divide-line rounded-2xl border border-line bg-surface px-4">
          {results.length === 0 ? (
            <p className="py-5 text-center text-sm text-muted">{query.trim().length < 2 ? t("Type at least 2 letters.") : t("No public profiles match. They may be private.")}</p>
          ) : (
            results.map((p) => <PersonRow key={p.id} p={p} />)
          )}
        </div>
      )}
    </div>
  );
}
