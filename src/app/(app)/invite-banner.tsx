"use client";

import { useState, useTransition } from "react";
import { Users, X } from "lucide-react";
import { acceptInviteAction, dismissInviteAction } from "./friends/actions";
import { Button } from "@/components/ui";
import { useT } from "@/lib/i18n/client";

export function InviteBanner({ token, text }: { token: string; text: string }) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3">
      <Users className="size-5 shrink-0 text-accent" />
      <p className="min-w-0 flex-1 text-sm font-semibold text-ink">{t(error ?? "") || text}</p>
      <Button
        variant="accent"
        className="h-9"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await acceptInviteAction(token);
            if (res?.error) setError(res.error);
          })
        }
      >{t("Accept")}</Button>
      <button type="button" aria-label={t("Dismiss invite")} disabled={pending} onClick={() => start(() => dismissInviteAction())} className="rounded-lg p-1 text-muted hover:bg-surface">
        <X className="size-4" />
      </button>
    </div>
  );
}
