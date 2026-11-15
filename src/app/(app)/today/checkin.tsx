"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Alert, Button, Card, CardHeader, Spinner, Textarea, cx } from "@/components/ui";
import { CHECKIN_LENSES, byId } from "@/lib/domain/variety";
import { WritingEpisode } from "./writing-episode";
import type { CheckinAnalysis, CheckinQuestion } from "@/lib/ai/schemas";
import { postJSON } from "@/lib/client/api";
import type { CheckinRow } from "@/lib/server/types";

function ScaleInput({ q, value, onChange }: { q: CheckinQuestion; value?: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-pressed={value === n}
            aria-label={`${n}`}
            className={cx(
              "h-9 rounded-md border text-sm tabular-nums transition-colors",
              value === n ? "border-primary bg-primary text-white" : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink",
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-muted">
        <span>1 · {q.scale_low_label}</span>
        <span>{q.scale_high_label} · 10</span>
      </div>
    </div>
  );
}

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
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
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

  const submit = () =>
    run("submit", async () => {
      const res = await postJSON<{ analysis: CheckinAnalysis | null; analysisError: string | null }>("/api/checkin/submit", {
        answers: checkin!.questions.map((q) => ({ id: q.id, value: answers[q.id] ?? "" })),
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
        <h2 className="text-lg font-semibold">Start with a short check-in</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          A few questions about the last 24 hours. Your answers are used to write today&apos;s story, scenarios and challenge, and to track how
          you are changing over time.
        </p>
        {error && <div className="mt-4"><Alert tone="danger">{error}</Alert></div>}
        <Button className="mt-6" onClick={start} disabled={busy !== null}>
          {busy === "start" ? <Spinner /> : null} {busy === "start" ? "Preparing your questions…" : "Begin check-in"}
        </Button>
      </Card>
    );
  }

  if (!checkin.completed_at) {
    const complete = checkin.questions.every((q) => {
      const v = answers[q.id];
      return v != null && String(v).trim().length > (q.type === "text" ? 1 : 0);
    });
    return (
      <Card>
        <CardHeader
          title={`Check-in · Day ${checkin.day_number}`}
          description="Be specific - concrete examples make your session more useful."
          action={lensLabel ? <span className="whitespace-nowrap rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">Today&apos;s angle: {lensLabel}</span> : undefined}
        />
        <div className="divide-y divide-line">
          {checkin.questions.map((q, i) => (
            <div key={q.id} className="px-5 py-5">
              <p className="mb-3 text-sm leading-relaxed">
                <span className="mr-2 text-muted tabular-nums">{i + 1}.</span>
                {q.text}
              </p>
              {q.type === "scale" && <ScaleInput q={q} value={answers[q.id] as number | undefined} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />}
              {q.type === "text" && (
                <Textarea rows={3} maxLength={2000} value={(answers[q.id] as string) ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} />
              )}
              {q.type === "choice" && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {(q.options ?? []).map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: o }))}
                      aria-pressed={answers[q.id] === o}
                      className={cx(
                        "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                        answers[q.id] === o ? "border-primary bg-primary-soft font-medium" : "border-line text-muted hover:border-line-strong hover:text-ink",
                      )}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          {error ? <Alert tone="danger">{error}</Alert> : <span className="text-xs text-muted">Answers are private and saved to your account.</span>}
          <Button onClick={submit} disabled={!complete || busy !== null}>
            {busy === "submit" && <Spinner />} {busy === "submit" ? "Saving…" : "Submit check-in"}
          </Button>
        </div>
      </Card>
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
              <p className="mb-4 text-sm text-muted">Built from your check-in. Read your insight above while you wait - this takes a minute or two.</p>
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
                {busy === "session"
                  ? "Writing an original story and scenarios from your check-in. This usually takes one to two minutes."
                  : "Introduction, story, scenarios, a real-world challenge and a reflection."}
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
