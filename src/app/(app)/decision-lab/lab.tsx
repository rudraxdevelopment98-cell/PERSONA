"use client";

import { AIThinking } from "@/components/ai-thinking";
import { UpgradeHint, isUpgradeError } from "@/components/upgrade";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alert, Badge, Button, Card, CardHeader, Label, Select, Spinner, cx } from "@/components/ui";
import type { DecisionEvaluation, DecisionScenario } from "@/lib/ai/schemas";
import { postJSON } from "@/lib/client/api";
import { DECISION_CATEGORIES, DECISION_DIFFICULTIES } from "@/lib/domain/labs";
import { DeepFeedback } from "@/components/feedback";
import { RubricTable } from "@/components/rubric";
import { VoiceTextarea } from "@/components/voice-input";

type Pending = { id: string; scenario: DecisionScenario; category: string; difficulty: string };

const LABELS: Record<string, string> = {
  clear_criteria: "Clear criteria",
  alternatives_considered: "Alternatives",
  risk_and_consequences: "Risk & consequences",
  ownership: "Ownership",
};

export function DecisionLab({ pending }: { pending: Pending | null }) {
  const router = useRouter();
  const [category, setCategory] = useState<string>(DECISION_CATEGORIES[0].id);
  const [difficulty, setDifficulty] = useState<string>("moderate");
  const [current, setCurrent] = useState<Pending | null>(pending);
  const [choice, setChoice] = useState<string | null>(null);
  const [reasoning, setReasoning] = useState("");
  const [confidence, setConfidence] = useState(5);
  const [result, setResult] = useState<{ evaluation: DecisionEvaluation; score: number } | null>(null);
  const [busy, setBusy] = useState<null | "new" | "submit">(null);
  const [error, setError] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState(false);

  const shownAt = useRef(0);
  const firstChoiceAt = useRef<number | null>(null);
  const changes = useRef(0);

  useEffect(() => {
    shownAt.current = Date.now();
    firstChoiceAt.current = null;
    changes.current = 0;
  }, [current?.id]);

  function pick(id: string) {
    if (result) return;
    if (firstChoiceAt.current == null) firstChoiceAt.current = Date.now();
    else if (choice !== id) changes.current += 1;
    setChoice(id);
  }

  async function generate() {
    setBusy("new");
    setError(null);
    try {
      const res = await postJSON<{ id: string; scenario: DecisionScenario }>("/api/decision/new", { category, difficulty });
      setCurrent({ id: res.id, scenario: res.scenario, category, difficulty });
      setChoice(null);
      setReasoning("");
      setConfidence(5);
      setResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create a scenario.");
      setUpgrade(isUpgradeError(e));
    } finally {
      setBusy(null);
    }
  }

  async function submit() {
    if (!current || !choice) return;
    setBusy("submit");
    setError(null);
    try {
      const now = Date.now();
      const res = await postJSON<{ evaluation: DecisionEvaluation; score: number }>("/api/decision/submit", {
        id: current.id,
        chosen_option: choice,
        reasoning,
        confidence,
        first_choice_ms: firstChoiceAt.current != null ? firstChoiceAt.current - shownAt.current : null,
        total_time_ms: now - shownAt.current,
        choice_changes: changes.current,
      });
      setResult(res);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit.");
      setUpgrade(false);
    } finally {
      setBusy(null);
    }
  }

  const s = current?.scenario;
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <Label htmlFor="cat">Category</Label>
            <Select id="cat" value={category} onChange={(e) => setCategory(e.target.value)}>
              {DECISION_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="diff">Difficulty</Label>
            <Select id="diff" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              {DECISION_DIFFICULTIES.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </Select>
          </div>
          <Button onClick={generate} disabled={busy !== null || Boolean(current && !result && choice)}>
            {busy === "new" && <Spinner />} {busy === "new" ? "Creating…" : current ? "New scenario" : "Generate scenario"}
          </Button>
        </div>
        {busy === "new" && <AIThinking className="mt-4" steps={["Imagining a situation that fits you…", "Adding the people and the pressure…", "Writing your options…"]} />}
        {error && !s && <div className="mt-4"><Alert tone={upgrade ? "warning" : "danger"}>{error}</Alert><UpgradeHint show={upgrade} /></div>}
      </Card>

      {s && (
        <Card>
          <CardHeader title={s.title} action={result ? <Badge tone="primary">{result.score}/100</Badge> : undefined} />
          <div className="space-y-4 px-5 py-4">
            <p className="text-sm leading-relaxed">{s.context}</p>
            <p className="text-sm"><span className="font-medium">What&apos;s at stake:</span> {s.stakes}</p>
            {s.constraints.length > 0 && (
              <ul className="space-y-1 text-sm text-muted">
                {s.constraints.map((c, i) => (
                  <li key={i}>· {c}</li>
                ))}
              </ul>
            )}
            <div className="space-y-2">
              {s.options.map((o) => {
                const consequence = result?.evaluation.option_consequences.find((c) => c.id === o.id)?.consequence;
                return (
                  <div key={o.id}>
                    <button
                      type="button"
                      onClick={() => pick(o.id)}
                      disabled={Boolean(result)}
                      aria-pressed={choice === o.id}
                      className={cx(
                        "flex w-full gap-3 rounded-xl border-2 px-3.5 py-3 text-left text-sm transition-all",
                        choice === o.id ? "border-primary bg-primary-soft" : "border-line hover:border-line-strong",
                      )}
                    >
                      <span className="font-medium uppercase text-muted">{o.id}</span>
                      <span>{o.text}</span>
                    </button>
                    {consequence && <p className="mt-1 pl-9 text-xs leading-relaxed text-muted">{consequence}</p>}
                  </div>
                );
              })}
            </div>

            {!result ? (
              <>
                <div>
                  <Label htmlFor="reasoning">Your reasoning: what matters most here, what did you weigh up, and what could go wrong?</Label>
                  <VoiceTextarea id="reasoning" rows={4} maxLength={4000} value={reasoning} onChange={(e) => setReasoning(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="confidence">
                    How confident are you in this decision? <span className="tabular-nums text-muted">{confidence}/10</span>
                  </Label>
                  <input id="confidence" type="range" min={1} max={10} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} className="w-full" />
                </div>
                {error && (
                  <div>
                    <Alert tone={upgrade ? "warning" : "danger"}>{error}</Alert>
                    <UpgradeHint show={upgrade} />
                  </div>
                )}
                {busy === "submit" ? (
                  <AIThinking steps={["Reading your reasoning…", "Playing out what happens next…", "Scoring your decision…"]} />
                ) : (
                  <div className="flex justify-end">
                    <Button onClick={submit} disabled={!choice || reasoning.trim().length < 20 || busy !== null}>
                      Commit to decision
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="animate-pop space-y-4 rounded-2xl bg-bg p-4">
                <RubricTable rubric={result.evaluation.rubric} labels={LABELS} />
                {result.evaluation.biases_noticed.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-muted">Biases noticed:</span>
                    {result.evaluation.biases_noticed.map((b) => (
                      <Badge key={b} tone="warning">{b}</Badge>
                    ))}
                  </div>
                )}
                <DeepFeedback
                  yourWords={result.evaluation.your_words}
                  wentWell={result.evaluation.what_went_well}
                  toImprove={result.evaluation.to_improve}
                  concept={result.evaluation.concept}
                  conceptLabel="Decision science"
                  example={result.evaluation.better_approach}
                  exampleLabel="A better way to decide"
                  extra={[{ label: "About your hesitation", text: result.evaluation.hesitation_insight }]}
                  practiseNext={result.evaluation.practise_next}
                />
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
