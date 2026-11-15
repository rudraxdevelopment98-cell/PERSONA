"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Check, Lock, Target } from "lucide-react";
import { DeepFeedback } from "@/components/feedback";
import { RubricTable } from "@/components/rubric";
import { Alert, Badge, Button, Card, CardHeader, ProgressBar, Spinner, Textarea, cx } from "@/components/ui";
import type { ReflectionFeedback, ScenarioEvaluation } from "@/lib/ai/schemas";
import { postJSON } from "@/lib/client/api";
import type { Dimension } from "@/lib/domain/dimensions";
import type { SessionRow } from "@/lib/server/types";

export type ClientScenario = {
  title: string;
  situation: string;
  question: string;
  skill: Dimension;
  format?: string | null;
  options: { id: string; text: string; consequence?: string; quality?: "strong" | "reasonable" | "weak" }[];
  response: { choice_id: string; reasoning: string; score: number | null; evaluation: ScenarioEvaluation | null } | null;
};

type ClientSession = {
  id: string;
  introduction: SessionRow["introduction"];
  challenge: SessionRow["challenge"];
  reflection_questions: string[];
  story_progress: number;
  story_completed: boolean;
  scenarios_completed: boolean;
  challenge_status: SessionRow["challenge_status"];
  challenge_notes: string | null;
  reflection_answers: string[] | null;
  reflection_feedback: ReflectionFeedback | null;
  completed: boolean;
};

type Story = { title: string; body: string; word_count: number; insights: { title: string; explanation: string }[] };
import { EpisodeTag, NextEpisode, Previously, type EpisodeInfo } from "./episode";

function Section({
  n,
  title,
  minutes,
  locked,
  done,
  lockedText,
  children,
}: {
  n: number;
  title: string;
  minutes: string;
  locked: boolean;
  done: boolean;
  lockedText: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative">
      <div className="mb-3 flex items-center gap-3">
        <span
          className={cx(
            "flex size-6 items-center justify-center rounded-full border text-xs font-medium tabular-nums",
            done ? "border-success bg-success text-white" : locked ? "border-line-strong text-muted" : "border-primary text-primary",
          )}
        >
          {done ? <Check className="size-3.5" strokeWidth={3} /> : n}
        </span>
        <h2 className={cx("text-sm font-semibold", locked && "text-muted")}>{title}</h2>
        <span className="text-xs text-muted">{minutes}</span>
      </div>
      {locked ? (
        <div className="flex items-center gap-2 rounded-2xl border border-dashed border-line-strong px-5 py-4 text-sm text-muted">
          <Lock className="size-4" strokeWidth={1.75} /> {lockedText}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

function Feedback({ title, items }: { title?: string; items: { label: string; text: string }[] }) {
  return (
    <div className="space-y-3">
      {title && <p className="text-sm font-medium">{title}</p>}
      {items
        .filter((i) => i.text)
        .map((i) => (
          <div key={i.label}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">{i.label}</p>
            <p className="mt-0.5 text-sm leading-relaxed">{i.text}</p>
          </div>
        ))}
    </div>
  );
}

const RUBRIC_LABELS: Record<string, string> = {
  situational_awareness: "Situational awareness",
  quality_of_reasoning: "Quality of reasoning",
  independence: "Independence",
  practicality: "Practicality",
};

function StoryReader({ sessionId, story, initialProgress, completed, onComplete, episode }: { sessionId: string; story: Story; initialProgress: number; completed: boolean; onComplete: () => void; episode: EpisodeInfo | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(completed ? 100 : initialProgress);
  const sent = useRef(initialProgress);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const report = useCallback(
    (p: number) => {
      if (p - sent.current < 10 && p < 100) return;
      sent.current = p;
      postJSON("/api/session/progress", { session_id: sessionId, progress: p }).catch(() => {});
    },
    [sessionId],
  );

  useEffect(() => {
    if (completed) return;
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const seen = (window.innerHeight - rect.top) / rect.height;
      const p = Math.round(Math.max(0, Math.min(1, seen)) * 100);
      setProgress((prev) => {
        const next = Math.max(prev, p);
        if (next !== prev) report(next);
        return next;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [completed, report]);

  async function markRead() {
    setBusy(true);
    setError(null);
    try {
      await postJSON("/api/session/progress", { session_id: sessionId, progress, complete: true });
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  const minutes = Math.max(1, Math.round(story.word_count / 220));
  return (
    <Card>
      <div className="sticky top-14 z-10 flex items-center gap-3 rounded-t-lg border-b border-line bg-surface/95 px-5 py-3 backdrop-blur lg:top-0">
        <BookOpen className="size-4 shrink-0 text-muted" strokeWidth={1.75} />
        <ProgressBar value={progress} />
        <span className="shrink-0 text-xs tabular-nums text-muted">{progress}%</span>
      </div>
      <article className="px-5 py-8 sm:px-10">
        {episode && (
          <div className="mb-3">
            <EpisodeTag info={episode} />
          </div>
        )}
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Story · {story.word_count.toLocaleString()} words · about {minutes} min
        </p>
        <h3 className="mt-2 font-serif text-2xl font-semibold leading-snug">{story.title}</h3>
        <div ref={ref} className="story-body mt-6 max-w-[65ch] font-serif text-[17px] leading-[1.75] text-ink">
          {story.body
            .split(/\n\s*\n/)
            .filter((p) => p.trim())
            .map((p, i) => (
              <p key={i}>{p.trim()}</p>
            ))}
        </div>
      </article>
      {completed ? (
        <div className="border-t border-line px-5 py-5 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Psychological insights</p>
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            {story.insights.map((ins) => (
              <div key={ins.title} className="rounded-xl bg-bg p-4">
                <p className="text-sm font-medium">{ins.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{ins.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          {error ? <Alert tone="warning">{error}</Alert> : <span className="text-xs text-muted">Scroll to the end of the story to continue.</span>}
          <Button onClick={markRead} disabled={progress < 95 || busy}>
            {busy && <Spinner />} I&apos;ve finished reading
          </Button>
        </div>
      )}
    </Card>
  );
}

function ScenarioCard({ sessionId, index, scenario, onAnswered }: { sessionId: string; index: number; scenario: ClientScenario; onAnswered: (s: ClientScenario) => void }) {
  const [choice, setChoice] = useState<string | null>(null);
  const [reasoning, setReasoning] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shownAt = useRef<number>(0);
  useEffect(() => {
    shownAt.current = Date.now();
  }, []);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await postJSON<{ evaluation: ScenarioEvaluation; score: number; options: ClientScenario["options"] }>("/api/session/scenario", {
        session_id: sessionId,
        index,
        choice_id: choice,
        reasoning,
        response_time_ms: Date.now() - shownAt.current,
      });
      onAnswered({ ...scenario, options: res.options, response: { choice_id: choice!, reasoning, score: res.score, evaluation: res.evaluation } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit.");
    } finally {
      setBusy(false);
    }
  }

  const r = scenario.response;
  return (
    <Card>
      <CardHeader
        title={`Scenario ${index + 1}: ${scenario.title}`}
        action={r?.score != null ? <Badge tone="primary">{r.score}/100</Badge> : scenario.format ? <Badge tone="accent">{scenario.format}</Badge> : undefined}
      />
      <div className="space-y-4 px-5 py-4">
        <p className="text-sm leading-relaxed">{scenario.situation}</p>
        <p className="text-sm font-medium">{scenario.question}</p>
        <div className="space-y-2">
          {scenario.options.map((o) => {
            const chosen = r ? r.choice_id === o.id : choice === o.id;
            return (
              <div key={o.id}>
                <button
                  type="button"
                  disabled={Boolean(r)}
                  onClick={() => setChoice(o.id)}
                  aria-pressed={chosen}
                  className={cx(
                    "flex w-full gap-3 rounded-xl border-2 px-3.5 py-3 text-left text-sm transition-all",
                    chosen ? "border-primary bg-primary-soft" : "border-line hover:border-line-strong hover:bg-bg",
                    r && !chosen && "opacity-80",
                  )}
                >
                  <span className="font-medium uppercase text-muted">{o.id}</span>
                  <span className="flex-1">{o.text}</span>
                  {o.quality && <Badge tone={o.quality === "strong" ? "success" : o.quality === "weak" ? "danger" : "neutral"}>{o.quality}</Badge>}
                </button>
                {o.consequence && <p className="mt-1 pl-9 text-xs leading-relaxed text-muted">{o.consequence}</p>}
              </div>
            );
          })}
        </div>

        {!r ? (
          <>
            <div>
              <label htmlFor={`reason-${index}`} className="mb-1.5 block text-sm font-medium">
                Why would you choose this? <span className="font-normal text-muted">Your reasoning is what gets evaluated.</span>
              </label>
              <Textarea id={`reason-${index}`} rows={3} maxLength={4000} value={reasoning} onChange={(e) => setReasoning(e.target.value)} />
            </div>
            {error && <Alert tone="danger">{error}</Alert>}
            <div className="flex justify-end">
              <Button onClick={submit} disabled={!choice || reasoning.trim().length < 15 || busy}>
                {busy && <Spinner />} {busy ? "Evaluating…" : "Submit answer"}
              </Button>
            </div>
          </>
        ) : (
          r.evaluation && (
            <div className="animate-pop space-y-4 rounded-2xl bg-bg p-4">
              <RubricTable rubric={r.evaluation.rubric} labels={RUBRIC_LABELS} />
              <DeepFeedback
                yourWords={r.evaluation.your_words}
                wentWell={r.evaluation.what_went_well}
                toImprove={r.evaluation.to_improve}
                concept={r.evaluation.concept}
                example={r.evaluation.example_response}
                extra={[{ label: "Your pattern", text: r.evaluation.pattern_note }]}
                practiseNext={r.evaluation.practise_next}
              />
            </div>
          )
        )}
      </div>
    </Card>
  );
}

function ChallengeCard({ session, onSaved }: { session: ClientSession; onSaved: (status: ClientSession["challenge_status"], notes: string | null) => void }) {
  const [notes, setNotes] = useState(session.challenge_notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(session.challenge_status === "pending");

  async function save(status: ClientSession["challenge_status"]) {
    setBusy(true);
    setError(null);
    try {
      await postJSON("/api/session/challenge", { session_id: session.id, status, notes: notes.trim() || null });
      onSaved(status, notes.trim() || null);
      setEditing(status === "pending");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  const c = session.challenge;
  return (
    <Card>
      <CardHeader
        title={c.title}
        description={`Difficulty: ${c.difficulty}`}
        action={
          session.challenge_status === "completed" ? (
            <Badge tone="success">Completed</Badge>
          ) : session.challenge_status === "skipped" ? (
            <Badge>Skipped</Badge>
          ) : (
            <Badge tone="warning">To do today</Badge>
          )
        }
      />
      <div className="space-y-4 px-5 py-4">
        <div className="flex gap-3">
          <Target className="mt-0.5 size-4 shrink-0 text-muted" strokeWidth={1.75} />
          <p className="text-sm leading-relaxed">{c.description}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">You&apos;ve done it when</p>
          <ul className="mt-1.5 space-y-1 text-sm">
            {c.success_criteria.map((s, i) => (
              <li key={i} className="flex gap-2">
                <Check className="mt-0.5 size-3.5 shrink-0 text-muted" /> {s}
              </li>
            ))}
          </ul>
        </div>
        {editing ? (
          <>
            <div>
              <label htmlFor="challenge-notes" className="mb-1.5 block text-sm font-medium">
                What happened? <span className="font-normal text-muted">Record this after you have tried it - later today is fine.</span>
              </label>
              <Textarea id="challenge-notes" rows={3} maxLength={4000} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            {error && <Alert tone="danger">{error}</Alert>}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => save("skipped")} disabled={busy}>
                Skip this challenge
              </Button>
              <Button onClick={() => save("completed")} disabled={busy || notes.trim().length < 10}>
                {busy && <Spinner />} Mark as done
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-3 rounded-xl bg-bg p-4 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-sm leading-relaxed">{session.challenge_notes || "No notes recorded."}</p>
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Update
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

function ReflectionCard({ session, onDone }: { session: ClientSession; onDone: (answers: string[], feedback: ReflectionFeedback | null) => void }) {
  const [answers, setAnswers] = useState<string[]>(session.reflection_answers ?? session.reflection_questions.map(() => ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await postJSON<{ feedback: ReflectionFeedback | null }>("/api/session/reflect", { session_id: session.id, answers });
      onDone(answers, res.feedback);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="divide-y divide-line">
        {session.reflection_questions.map((q, i) => (
          <div key={i} className="px-5 py-4">
            <label htmlFor={`refl-${i}`} className="mb-2 block text-sm leading-relaxed">
              {q}
            </label>
            {session.completed ? (
              <p className="rounded-xl bg-bg px-3 py-2 text-sm leading-relaxed">{answers[i]}</p>
            ) : (
              <Textarea
                id={`refl-${i}`}
                rows={3}
                maxLength={3000}
                value={answers[i]}
                onChange={(e) => setAnswers((a) => a.map((x, j) => (j === i ? e.target.value : x)))}
              />
            )}
          </div>
        ))}
      </div>
      {session.completed ? (
        session.reflection_feedback && (
          <div className="border-t border-line px-5 py-4">
            <p className="mb-3 text-sm leading-relaxed">{session.reflection_feedback.summary}</p>
            <Feedback
              items={[
                { label: "What you did well", text: session.reflection_feedback.what_went_well },
                { label: "Worth noticing", text: session.reflection_feedback.to_improve },
                { label: "Practise tomorrow", text: session.reflection_feedback.practise_next },
              ]}
            />
          </div>
        )
      ) : (
        <div className="flex flex-col gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          {error ? <Alert tone="danger">{error}</Alert> : <span className="text-xs text-muted">Completing the reflection completes today&apos;s session.</span>}
          <Button onClick={submit} disabled={busy || answers.some((a) => a.trim().length < 10)}>
            {busy && <Spinner />} {busy ? "Saving…" : "Complete session"}
          </Button>
        </div>
      )}
    </Card>
  );
}

export function SessionFlow({
  session: initial,
  story,
  scenarios: initialScenarios,
  episode = null,
}: {
  session: ClientSession;
  story: Story | null;
  scenarios: ClientScenario[];
  episode?: EpisodeInfo | null;
}) {
  const router = useRouter();
  const [session, setSession] = useState(initial);
  const [scenarios, setScenarios] = useState(initialScenarios);
  const [started, setStarted] = useState(initial.story_progress > 0 || initial.story_completed);
  const intro = session.introduction;
  const scenariosDone = scenarios.every((s) => s.response);

  return (
    <div className="space-y-10">
      {session.completed && (
        <Alert tone="success">
          Today&apos;s session is complete.{" "}
          {session.challenge_status === "pending" ? "Remember to record your real-world challenge once you've tried it." : "See you tomorrow."}
        </Alert>
      )}
      {session.completed && episode && <NextEpisode info={episode} />}

      <Section n={1} title="Introduction" minutes="3 min" locked={false} done={started} lockedText="">
        <Card className="p-5 sm:p-6">
          <h3 className="text-lg font-semibold">{intro.title}</h3>
          <p className="mt-3 text-sm leading-relaxed">{intro.why_it_matters}</p>
          <div className="mt-4 rounded-xl border-l-2 border-primary bg-bg px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Key idea</p>
            <p className="mt-1 text-sm leading-relaxed">{intro.key_idea}</p>
          </div>
          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted">Today you will practise</p>
          <ul className="mt-1.5 space-y-1 text-sm">
            {intro.what_you_will_practise.map((p, i) => (
              <li key={i}>· {p}</li>
            ))}
          </ul>
          {!started && (
            <Button className="mt-5" onClick={() => setStarted(true)}>
              Begin the story
            </Button>
          )}
        </Card>
      </Section>

      <Section n={2} title="Story" minutes="10 min" locked={!started} done={session.story_completed} lockedText="Read the introduction first.">
        {story ? (
          <div className="space-y-3">
          {episode && <Previously info={episode} />}
          <StoryReader
            episode={episode}
            sessionId={session.id}
            story={story}
            initialProgress={session.story_progress}
            completed={session.story_completed}
            onComplete={() => setSession((s) => ({ ...s, story_completed: true, story_progress: 100 }))}
          />
          </div>
        ) : (
          <Alert tone="danger">The story for this session could not be loaded.</Alert>
        )}
      </Section>

      <Section n={3} title="Interactive scenarios" minutes="7 min" locked={!session.story_completed} done={scenariosDone} lockedText="Finish the story to unlock the scenarios.">
        <div className="space-y-4">
          {scenarios.map((sc, i) => (
            <ScenarioCard
              key={i}
              sessionId={session.id}
              index={i}
              scenario={sc}
              onAnswered={(updated) => {
                const next = scenarios.map((x, j) => (j === i ? updated : x));
                setScenarios(next);
                if (next.every((x) => x.response)) setSession((s) => ({ ...s, scenarios_completed: true }));
              }}
            />
          ))}
        </div>
      </Section>

      <Section
        n={4}
        title="Real-world challenge"
        minutes="7 min to plan"
        locked={!scenariosDone}
        done={session.challenge_status === "completed"}
        lockedText="Complete the scenarios to see today's challenge."
      >
        <ChallengeCard
          session={session}
          onSaved={(status, notes) => {
            setSession((s) => ({ ...s, challenge_status: status, challenge_notes: notes }));
            router.refresh();
          }}
        />
      </Section>

      <Section n={5} title="Reflection" minutes="3 min" locked={!scenariosDone} done={session.completed} lockedText="Complete the scenarios first.">
        <ReflectionCard
          session={session}
          onDone={(answers, feedback) => {
            setSession((s) => ({ ...s, reflection_answers: answers, reflection_feedback: feedback, completed: true }));
            router.refresh();
          }}
        />
      </Section>
    </div>
  );
}
