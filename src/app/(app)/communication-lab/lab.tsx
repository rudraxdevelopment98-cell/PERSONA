"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RubricTable } from "@/components/rubric";
import { Alert, Badge, Button, Card, CardHeader, Label, Spinner, Textarea, cx } from "@/components/ui";
import type { CommunicationEvaluation, CommunicationPrompt } from "@/lib/ai/schemas";
import { postJSON } from "@/lib/client/api";
import { COMMUNICATION_EXERCISES, EXERCISE_BY_ID } from "@/lib/domain/labs";

type Pending = { id: string; exercise_type: string; prompt: CommunicationPrompt };
const LABELS = { clarity: "Clarity", assertiveness: "Assertiveness", empathy: "Empathy", composure: "Composure" };

export function CommunicationLab({ stats, pending }: { stats: { id: string; count: number; avg: number | null }[]; pending: Pending | null }) {
  const router = useRouter();
  const [current, setCurrent] = useState<Pending | null>(pending);
  const [response, setResponse] = useState("");
  const [result, setResult] = useState<{ evaluation: CommunicationEvaluation; score: number } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(type: string) {
    setBusy(type);
    setError(null);
    try {
      const res = await postJSON<{ id: string; prompt: CommunicationPrompt }>("/api/communication/new", { exercise_type: type });
      setCurrent({ id: res.id, exercise_type: type, prompt: res.prompt });
      setResponse("");
      setResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the exercise.");
    } finally {
      setBusy(null);
    }
  }

  async function submit() {
    if (!current) return;
    setBusy("submit");
    setError(null);
    try {
      setResult(await postJSON("/api/communication/submit", { id: current.id, response }));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {COMMUNICATION_EXERCISES.map((e) => {
          const s = stats.find((x) => x.id === e.id);
          const active = current?.exercise_type === e.id;
          return (
            <button
              key={e.id}
              onClick={() => start(e.id)}
              disabled={busy !== null}
              className={cx(
                "rounded-lg border bg-surface p-4 text-left shadow-card transition-colors disabled:opacity-60",
                active ? "border-primary" : "border-line hover:border-line-strong",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{e.label}</p>
                {busy === e.id && <Spinner className="text-muted" />}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted">{e.description}</p>
              <p className="mt-3 text-xs tabular-nums text-muted">{s?.count ? `${s.count} done · avg ${s.avg}` : "Not tried yet"}</p>
            </button>
          );
        })}
      </div>

      {error && !current && <Alert tone="danger">{error}</Alert>}

      {current && (
        <Card>
          <CardHeader
            title={current.prompt.title}
            description={EXERCISE_BY_ID.get(current.exercise_type)?.label}
            action={result ? <Badge tone="primary">{result.score}/100</Badge> : undefined}
          />
          <div className="space-y-4 px-5 py-4">
            <p className="text-sm leading-relaxed">{current.prompt.setting}</p>
            <p className="text-sm text-muted">{current.prompt.other_person}</p>
            <blockquote className="border-l-2 border-primary bg-bg px-4 py-3 text-sm leading-relaxed">&ldquo;{current.prompt.they_say}&rdquo;</blockquote>
            <p className="text-sm"><span className="font-medium">Your goal:</span> {current.prompt.your_goal}</p>

            {!result ? (
              <>
                <div>
                  <Label htmlFor="reply">What do you say? Write it exactly as you would say it.</Label>
                  <Textarea id="reply" rows={4} maxLength={3000} value={response} onChange={(e) => setResponse(e.target.value)} />
                </div>
                {error && <Alert tone="danger">{error}</Alert>}
                <div className="flex justify-end">
                  <Button onClick={submit} disabled={response.trim().length < 10 || busy !== null}>
                    {busy === "submit" && <Spinner />} {busy === "submit" ? "Evaluating…" : "Submit reply"}
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4 rounded-md bg-bg p-4">
                <RubricTable rubric={result.evaluation.rubric} labels={LABELS} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">You said</p>
                    <p className="mt-0.5 text-sm leading-relaxed">{response}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">A stronger version</p>
                    <p className="mt-0.5 text-sm leading-relaxed">{result.evaluation.stronger_version}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">What worked</p>
                    <p className="mt-0.5 text-sm leading-relaxed">{result.evaluation.what_went_well}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">To improve</p>
                    <p className="mt-0.5 text-sm leading-relaxed">{result.evaluation.to_improve}</p>
                  </div>
                </div>
                <p className="text-sm"><span className="font-medium">Practise next:</span> {result.evaluation.practise_next}</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
