"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { FaceAvatar } from "@/components/moments";
import { Button, Card, Spinner } from "@/components/ui";
import { useT } from "@/lib/i18n/client";
import { haptic } from "@/components/motion";
import { respondRequestAction } from "../discover-actions";

type Req = { id: string; name: string; avatar_emoji: string | null; cover: string | null; since: string };

export function PendingRequests({ requests }: { requests: Req[] }) {
  const t = useT();
  const [list, setList] = useState(requests);
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();
  const respond = (id: string, accept: boolean) => {
    haptic();
    setBusy(id);
    start(async () => {
      await respondRequestAction(id, accept);
      setList((xs) => xs.filter((r) => r.id !== id));
      setBusy(null);
    });
  };
  if (list.length === 0) return null;
  return (
    <Card className="p-4">
      <p className="mb-1 text-sm font-bold">{t("Friend requests")} <span className="text-muted">{list.length}</span></p>
      <div className="divide-y divide-line">
        {list.map((r) => (
          <div key={r.id} className="flex items-center gap-3 py-3">
            <FaceAvatar name={r.name} emoji={r.avatar_emoji} cover={r.cover} size="md" />
            <p className="min-w-0 flex-1 truncate font-semibold">{r.name}</p>
            <Button className="h-8 px-3" disabled={busy === r.id} onClick={() => respond(r.id, true)}>
              {busy === r.id ? <Spinner /> : <><Check className="size-4" /> {t("Accept")}</>}
            </Button>
            <button type="button" aria-label={t("Decline")} disabled={busy === r.id} onClick={() => respond(r.id, false)} className="rounded-lg p-1.5 text-muted hover:bg-bg">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
