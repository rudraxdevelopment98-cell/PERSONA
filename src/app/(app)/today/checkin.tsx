"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Alert, Button, Card, CardHeader, Spinner } from "@/components/ui";
import { CHECKIN_LENSES, byId } from "@/lib/domain/variety";
import { WritingEpisode } from "./writing-episode";
import { CheckinDeck, type TodayMoment } from "./checkin-deck";
import type { CheckinAnalysis } from "@/lib/ai/schemas";
import { postJSON } from "@/lib/client/api";
import type { CheckinRow } from "@/lib/server/types";

// One in-flight build per page, shared by the automatic start and the button.
let sessionBuild: Promise<unknown> | null = null;
function startSessionBuild() {
  if (!sessionBuild) {
    sessionBuild = postJSON("/api/session/generate").catch((e) => {
      sessionBuild = null;
      throw e;
    });
  }
  return sessionBuild;
}

export function CheckinFlow({ checkin: initial, hasSession }: { checkin: CheckinRow | null; hasSession: boolean }) {
  const router = useRouter();
  const [checkin, setCheckin] = useState(initial);
  const [analysis, setAnalysis] = useState<CheckinAnalysis | null>(initial?.analysis ?? null);
  const [busy, setBusy] = useState<null | "start" | "submit" | "session">(null);
  const [error, setError] = useState<string | null>(null);
  const lensLabel = byId(CHECKIN_LENSES, checkin?.lens)?.label ?? null;
  const [buildStarted, setBuildStarted] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  // Start writing the session in the background while the user reads the insight.
  function prebuild() {
    if (hasSession) return;
    setBuildStarted((t) => t ?? Date.now());
    startSessionBuild().then(
      () => setReady(true),
      () => setBuildStarted(null),
    );
  }

  async function run<T>(kind: "start" | "submit" | "session", fn: () => Promise<T>) {
    setBusy(kind);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  const start = () => run("start", async () => setCheckin((await postJSON<{ checkin: CheckinRow }>("/api/checkin/start")).checkin));

  // Check-in already done (e.g. the page was reopened): start writing straight away.
  useEffect(() => {
    if (initial?.completed_at && !hasSession) prebuild();
    // Runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (answers: Record<string, string | number>, today: TodayMoment) =>
    run("submit", async () => {
      const res = await postJSON<{ analysis: CheckinAnalysis | null; analysisError: string | null }>("/api/checkin/submit", {
        answers: checkin!.questions.map((q) => ({ id: q.id, value: answers[q.id] ?? "" })),
        today,
      });
      setCheckin({ ...checkin!, completed_at: new Date().toISOString() });
      setAnalysis(res.analysis);
      prebuild();
      if (res.analysisError) setError(`Your answers were saved. ${res.analysisError}`);
    });

  const buildSession = () =>
    run("session", async () => {
      setBuildStarted((t) => t ?? Date.now());
      try {
        await startSessionBuild();
      } catch (e) {
        // The session may have been created even if the response was lost; reload to check.
        router.refresh();
        throw e;
      }
      router.refresh();
    });

  if (!checkin) {
    return (
      <Card className="p-6 sm:p-8">
        <p className="text-4xl">☀️</p>
        <h2 className="mt-3 text-xl font-extrabold">How was your last day?</h2>
        <p className="mt-1 text-sm text-muted">3 min · shapes today&apos;s story</p>
        {error && <div className="mt-4"><Alert tone="danger">{error}</Alert></div>}
        <Button className="mt-6" onClick={start} disabled={busy !== null}>
          {busy === "start" ? <Spinner /> : null} {busy === "start" ? "Preparing your questions…" : "Begin check-in"}
        </Button>
      </Card>
    );
  }

  if (!checkin.completed_at) {
    return (
      <CheckinDeck
        questions={checkin.questions}
        dayNumber={checkin.day_number}
        lensLabel={lensLabel}
        busy={busy === "submit"}
        error={error}
        onSubmit={submit}
      />
    );
  }

  return (
    <div className="space-y-6">
      {analysis && (
        <Card>
          <CardHeader title="Check-in insight" />
          <div className="grid gap-5 px-5 py-4 md:grid-cols-2">
            <div className="space-y-3 text-sm leading-relaxed">
              <p>{analysis.summary}</p>
              <p className="text-muted">{analysis.observation}</p>
            </div>
            <div className="space-y-3">
              {analysis.patterns.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Recurring patterns</p>
                  <ul className="mt-1.5 space-y-1 text-sm">
                    {analysis.patterns.map((p, i) => (
                      <li key={i}>· {p}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="rounded-md bg-bg p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Try today</p>
                <p className="mt-1 text-sm">{analysis.suggestion_for_today}</p>
              </div>
            </div>
          </div>
        </Card>
      )}
      {error && <Alert tone={analysis ? "danger" : "warning"}>{error}</Alert>}
      {!hasSession && (ready || buildStarted !== null) && (
        <Card className="p-6">
          {ready ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold">Your episode is ready 🎬</h2>
                <p className="mt-1 text-sm text-muted">Story, scenarios and today&apos;s mission are waiting.</p>
              </div>
              <Button onClick={() => router.refresh()} className="motion-safe:animate-pulse">
                <Sparkles className="size-4" /> Open today&apos;s session <ArrowRight className="size-4" />
              </Button>
            </div>
          ) : (
            <>
              <h2 className="mb-1 font-semibold">Writing today&apos;s episode…</h2>
              <p className="mb-4 text-sm text-muted">About a minute</p>
              <WritingEpisode startedAt={buildStarted!} />
            </>
          )}
        </Card>
      )}
      {!hasSession && !ready && buildStarted === null && (
        <Card className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Your 30-minute session</h2>
              <p className="mt-1 text-sm text-muted">
                {busy === "session" ? "About a minute" : "Story · scenarios · challenge · reflection"}
              </p>
            </div>
            <Button onClick={buildSession} disabled={busy !== null}>
              {busy === "session" ? <Spinner /> : <Sparkles className="size-4" />}
              {busy === "session" ? "Preparing your session…" : "Build today's session"}
              {busy !== "session" && <ArrowRight className="size-4" />}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
