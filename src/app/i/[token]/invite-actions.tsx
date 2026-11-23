"use client";

import { useEffect, useState, useTransition } from "react";
import { acceptInviteAction } from "@/app/(app)/friends/actions";
import { Alert, Button, ButtonLink } from "@/components/ui";
import { useT } from "@/lib/i18n/client";

export function InviteActions({ token, signedIn }: { token: string; signedIn: boolean }) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    // Remember the invite through sign-up so it can be accepted afterwards.
    if (!signedIn) document.cookie = `p90_invite=${token}; path=/; max-age=${7 * 86400}; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
  }, [signedIn, token]);

  if (!signedIn)
    return (
      <div className="space-y-2">
        <ButtonLink href="/signup" className="w-full">{t("Create a free account")}</ButtonLink>
        <ButtonLink href={`/login?next=${encodeURIComponent(`/i/${token}`)}`} variant="secondary" className="w-full">{t("I already have an account")}</ButtonLink>
      </div>
    );

  return (
    <div className="space-y-3">
      <Button
        className="w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await acceptInviteAction(token);
            if (res?.error) setError(res.error);
          })
        }
      >
        {pending ? t("Connecting...") : t("Accept invite")}
      </Button>
      <ButtonLink href="/dashboard" variant="ghost" className="w-full">{t("Not now")}</ButtonLink>
      {error && <Alert tone="danger">{t(error)}</Alert>}
    </div>
  );
}
