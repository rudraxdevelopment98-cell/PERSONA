"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinRaceAction, leaveRaceAction } from "@/app/(app)/friends/actions";
import { Alert, Button, Card } from "@/components/ui";

export function RaceJoin({ raceId, joined }: { raceId: string; joined: boolean }) {
  const router = useRouter();
  const [privately, setPrivately] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (res.error) setError(res.error);
      router.refresh();
    });
  return (
    <Card className="space-y-3 p-5">
      {joined ? (
        <>
          <p className="text-sm text-muted">You&apos;re in. Keep doing your daily sessions - they count automatically.</p>
          <Button variant="ghost" disabled={pending} onClick={() => confirm("Leave this race?") && run(() => leaveRaceAction(raceId))}>
            Leave race
          </Button>
        </>
      ) : (
        <>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={privately} onChange={(e) => setPrivately(e.target.checked)} className="size-4 accent-[var(--color-primary)]" />
            Race privately - others see &ldquo;A member&rdquo; instead of your name
          </label>
          <Button disabled={pending} onClick={() => run(() => joinRaceAction(raceId, privately))}>
            Join race
          </Button>
        </>
      )}
      {error && <Alert tone="danger">{error}</Alert>}
    </Card>
  );
}
