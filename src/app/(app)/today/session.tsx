"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, Check, ChevronDown, Target } from "lucide-react";
import { AIThinking } from "@/components/ai-thinking";
import { DeepFeedback } from "@/components/feedback";
import { ListenButton, type AIVoice } from "@/components/listen-button";
import { StoryChoice, type StoryChoiceData } from "./story-choice";
import { RubricTable } from "@/components/rubric";
import { Alert, Badge, Button, Card, CardHeader, ProgressBar, Spinner, cx } from "@/components/ui";
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

type Story = {
  title: string;
  body: string;
  word_count: number;
  insights: { title: string; explanation: string }[];
  choice?: StoryChoiceData | null;
  chosen?: string | null;
  choice_feedback?: string | null;
};
import { EpisodeTag, NextEpisode, Previously, type EpisodeInfo } from "./episode";
import { CelebrationOverlay, type Celebration } from "./celebration";
import { VoiceTextarea } from "@/components/voice-input";
import { useT } from "@/lib/i18n/client";

type Step = { key: string; title: string; minutes: string; done: boolean };

/** Five small steps instead of a list of locked boxes: done ones can be reopened, future ones stay quiet. */
function StepHeader({ steps, view, current, onPick }: { steps: Step[]; view: number; current: number; onPick: (i: number) => void }) {
  const t = useT();
  const doneCount = steps.filter((x) => x.done).length;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{t("Step {0} of {1}", view + 1, steps.length)} · <span className="font-medium text-ink">{t(steps[view].title)}</span> · {t(steps[view].minutes)}
        </span>
        <span className="tabular-nums">{t("{0}/{1} done", doneCount, steps.length)}</span>
      </div>
      <ol className="flex items-center gap-1.5" aria-label={t("Today's steps")}>
        {steps.map((st, i) => {
          const open = st.done || i <= current;
          return (
            <li key={st.key} className="flex-1">
              <button
                type="button"
                disabled={!open}
                onClick={() => onPick(i)}
                aria-current={i === view ? "step" : undefined}
                aria-label={`${st.title}${st.done ? " (done)" : ""}`}
                className={cx(
                  "group flex w-full flex-col items-center gap-1 rounded-xl py-1 transition",
                  open ? "cursor-pointer" : "cursor-default",
                )}
              >
                <span
                  className={cx(
                    "h-1.5 w-full rounded-full transition-all duration-500",
                    st.done ? "bg-success" : i === view ? "bg-primary" : i <= current ? "bg-primary/40" : "bg-line",
                  )}
                />
                <span
                  className={cx(
                    "flex items-center gap-0.5 text-[11px] leading-none",
                    i === view ? "font-semibold text-ink" : st.done ? "text-success" : "text-muted",
                  )}
                >
                  {st.done && <Check className="size-3" strokeWidth={3} />}
                  <span className="hidden sm:inline">{t(st.title)}</span>
                  <span className="sm:hidden">{t(st.title.split(" ")[0])}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function NextStep({ to, minutes, onClick, label, cta }: { to: string; minutes: string; onClick: () => void; label?: string; cta?: string }) {
  const t = useT();
  return (
    <div className="animate-pop flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs text-muted">{t(label ?? "") || t("Nice, step done.")}{" "}{t("Up next")}</p>
        <p className="truncate text-sm font-semibold">
          {t(to)} <span className="font-normal text-muted">· {t(minutes)}</span>
        </p>
      </div>
      <Button onClick={onClick}>{cta ?? t("Continue")}{" "}<ArrowRight className="size-4" />
      </Button>
    </div>
  );
}

/** Scenarios one at a time, with small dots for where you are. */
function ScenarioDeck({ sessionId, scenarios, onAnswered }: { sessionId: string; scenarios: ClientScenario[]; onAnswered: (i: number, s: ClientScenario) => void }) {
  const t = useT();
  const firstOpen = scenarios.findIndex((x) => !x.response);
  const [i, setI] = useState(firstOpen === -1 ? 0 : firstOpen);
  const sc = scenarios[i];
  return (
    <div className="space-y-3">
      {scenarios.length > 1 && (
        <div className="flex items-center justify-center gap-2" aria-label={t("Scenario {0} of {1}", i + 1, scenarios.length)}>
          {scenarios.map((x, j) => (
            <button
              key={j}
              type="button"
              aria-label={t("Scenario {0}", j + 1)}
              disabled={!x.response && j !== i && j !== firstOpen}
              onClick={() => setI(j)}
              className={cx("h-2 rounded-full transition-all", j === i ? "w-6 bg-primary" : x.response ? "w-2 bg-success" : "w-2 bg-line-strong")}
            />
          ))}
        </div>
      )}
      <div key={i} className="animate-step-in">
        <ScenarioCard sessionId={sessionId} index={i} scenario={sc} onAnswered={(u) => onAnswered(i, u)} />
      </div>
      {sc.response && i < scenarios.length - 1 && (
        <div className="flex justify-end">
          <Button variant="secondary" onClick={() => setI(i + 1)}>
            {scenarios[i + 1].response ? t("Next scenario") : t("Next scenario ({0}/{1})", i + 2, scenarios.length)} <ArrowRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function Feedback({ title, items }: { title?: string; items: { label: string; text: string }[] }) {
  const t = useT();
  return (
    <div className="space-y-3">
      {title && <p className="text-sm font-medium">{t(title)}</p>}
      {items
        .filter((i) => i.text)
        .map((i) => (
          <div key={i.label}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">{t(i.label)}</p>
            <p className="mt-0.5 text-sm leading-relaxed">{i.text}</p>
          </div>
        ))}
    </div>
  );
}

/** One friendly line instead of four score boxes; the breakdown sits under "full feedback". */
function ScoreLine({ rubric }: { rubric: Record<string, number> }) {
  const t = useT();
  const total = Math.round(Object.values(rubric).reduce((a, b) => a + b, 0));
  const word = total >= 75 ? t("Strong answer") : total >= 55 ? t("Good answer") : t("Good start");
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-base font-extrabold">{word}</p>
      <span className="rounded-full bg-primary-soft px-3 py-1 text-sm font-bold tabular-nums text-primary">{total}/100</span>
    </div>
  );
}

const RUBRIC_LABELS: Record<string, string> = {
  situational_awareness: "Situational awareness",
  quality_of_reasoning: "Quality of reasoning",
  independence: "Independence",
  practicality: "Practicality",
};

function StoryReader({ sessionId, story, initialProgress, completed, onComplete, episode, aiVoice }: { sessionId: string; story: Story; initialProgress: number; completed: boolean; onComplete: () => void; episode: EpisodeInfo | null; aiVoice: AIVoice | null }) {
  const t = useT();
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
  const awaitingChoice = Boolean(story.choice && !story.chosen && !completed);
  const paragraphs = story.body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const [speaking, setSpeaking] = useState<number | null>(null);
  const onParagraph = (i: number | null) => {
    setSpeaking(i);
    if (i === null) return;
    document.getElementById(`story-p-${i}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const onListenEnd = () => {
    if (completed) return;
    setProgress(100);
    report(100);
  };
  return (
    <Card>
      <div className="sticky top-14 z-10 flex items-center gap-3 rounded-t-lg border-b border-line bg-surface/95 px-5 py-3 backdrop-blur lg:top-0">
        <BookOpen className="size-4 shrink-0 text-muted" strokeWidth={1.75} />
        <ProgressBar value={progress} />
        <span className="shrink-0 text-xs tabular-nums text-muted">{progress}%</span>
        <ListenButton paragraphs={[story.title, ...paragraphs]} onParagraph={(i) => onParagraph(i === null || i === 0 ? null : i - 1)} onEnd={onListenEnd} ai={aiVoice} sessionId={sessionId} />
      </div>
      <article className="px-5 py-8 sm:px-10">
        {episode && (
          <div className="mb-3">
            <EpisodeTag info={episode} />
          </div>
        )}
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{t("Story · {0} words · about {1} min", story.word_count.toLocaleString(), minutes)}</p>
        <h3 className="mt-2 font-serif text-2xl font-semibold leading-snug">{t(story.title)}</h3>
        <div ref={ref} className="story-body mt-6 max-w-[65ch] font-serif text-[17px] leading-[1.75] text-ink">
          {paragraphs.map((p, i) => (
            <p key={i} id={`story-p-${i}`} className={cx("-mx-2 rounded-lg px-2 transition-colors duration-300", speaking === i && "bg-primary-soft")}>
              {t(p)}
            </p>
          ))}
        </div>
        {awaitingChoice && <StoryChoice sessionId={sessionId} choice={story.choice!} />}
        {story.chosen && story.choice && (
          <div className="mt-6 max-w-[65ch] rounded-2xl border border-line bg-bg p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">{t("Tumhari choice ·")}{" "}{t(story.choice.options.find((o) => o.id === story.chosen)?.vibe ?? "") || ""}
            </p>
            <p className="mt-1 font-semibold">{story.choice.options.find((o) => o.id === story.chosen)?.text}</p>
            {story.choice_feedback && <p className="mt-2 text-sm leading-relaxed text-muted">{t(story.choice_feedback)}</p>}
          </div>
        )}
      </article>
      {completed ? (
        <div className="border-t border-line px-5 py-5 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{t("Psychological insights")}</p>
          <div className="mt-3 space-y-2">
            {story.insights.map((ins, n) => (
              <details key={ins.title} open={n === 0} className="group rounded-xl bg-bg p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold">
                  {t(ins.title)} <ChevronDown className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t(ins.explanation)}</p>
              </details>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          {error ? <Alert tone="warning">{t(error)}</Alert> : <span />}
          <Button onClick={markRead} disabled={progress < 95 || busy || awaitingChoice}>
            {busy && <Spinner />}{" "}{t("I've finished reading")}</Button>
        </div>
      )}
    </Card>
  );
}

function ScenarioCard({ sessionId, index, scenario, onAnswered }: { sessionId: string; index: number; scenario: ClientScenario; onAnswered: (s: ClientScenario) => void }) {
  const t = useT();
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
        title={t("Scenario {0}: {1}", index + 1, scenario.title)}
        action={r?.score != null ? <Badge tone="primary">{r.score}/100</Badge> : scenario.format ? <Badge tone="accent">{t(scenario.format)}</Badge> : undefined}
      />
      <div className="space-y-4 px-5 py-4">
        <p className="text-sm leading-relaxed">{t(scenario.situation)}</p>
        <p className="text-sm font-medium">{t(scenario.question)}</p>
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
                  {o.quality && <Badge tone={o.quality === "strong" ? "success" : o.quality === "weak" ? "danger" : "neutral"}>{t(o.quality)}</Badge>}
                </button>
                {o.consequence && <p className="mt-1 pl-9 text-xs leading-relaxed text-muted">{t(o.consequence)}</p>}
              </div>
            );
          })}
        </div>

        {!r ? (
          <>
            <div>
              <label htmlFor={`reason-${index}`} className="mb-1.5 block text-sm font-medium">{t("Why would you choose this?")}</label>
              <VoiceTextarea id={`reason-${index}`} rows={3} maxLength={4000} value={reasoning} onChange={(e) => setReasoning(e.target.value)} />
            </div>
            {error && <Alert tone="danger">{t(error)}</Alert>}
            {busy ? (
              <AIThinking steps={["Reading your answer…", "Comparing it with how confident people reply…", "Writing your feedback…"]} />
            ) : (
              <div className="flex justify-end">
                <Button onClick={submit} disabled={!choice || reasoning.trim().length < 15}>{t("Submit answer")}</Button>
              </div>
            )}
          </>
        ) : (
          r.evaluation && (
            <div className="animate-pop space-y-4 rounded-2xl bg-bg p-4">
              <DeepFeedback
                headline={<ScoreLine rubric={r.evaluation.rubric} />}
                details={<RubricTable rubric={r.evaluation.rubric} labels={RUBRIC_LABELS} />}
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
  const t = useT();
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
        title={t(c.title)}
        description={t("Difficulty: {0}", t(c.difficulty))}
        action={
          session.challenge_status === "completed" ? (
            <Badge tone="success">{t("Completed")}</Badge>
          ) : session.challenge_status === "skipped" ? (
            <Badge>{t("Skipped")}</Badge>
          ) : (
            <Badge tone="warning">{t("To do today")}</Badge>
          )
        }
      />
      <div className="space-y-4 px-5 py-4">
        <div className="flex gap-3">
          <Target className="mt-0.5 size-4 shrink-0 text-muted" strokeWidth={1.75} />
          <p className="text-sm leading-relaxed">{t(c.description)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{t("You've done it when")}</p>
          <ul className="mt-1.5 space-y-1 text-sm">
            {c.success_criteria.map((s, i) => (
              <li key={i} className="flex gap-2">
                <Check className="mt-0.5 size-3.5 shrink-0 text-muted" /> {t(s)}
              </li>
            ))}
          </ul>
        </div>
        {editing ? (
          <>
            <div>
              <label htmlFor="challenge-notes" className="mb-1.5 block text-sm font-medium">{t("What happened?")}</label>
              <VoiceTextarea id="challenge-notes" rows={3} maxLength={4000} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            {error && <Alert tone="danger">{t(error)}</Alert>}
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => save("skipped")} disabled={busy}>{t("Skip this challenge")}</Button>
              {notes.trim().length >= 10 ? (
                <Button onClick={() => save("completed")} disabled={busy}>
                  {busy && <Spinner />}{" "}{t("Mark as done")}</Button>
              ) : (
                <span className="text-xs text-muted">{t("Did it already? Write 1 line above to mark it done.")}</span>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-3 rounded-xl bg-bg p-4 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-sm leading-relaxed">{session.challenge_notes || t("No notes recorded.")}</p>
            <Button variant="secondary" onClick={() => setEditing(true)}>{t("Update")}</Button>
          </div>
        )}
      </div>
    </Card>
  );
}

function ReflectionCard({ session, onDone }: { session: ClientSession; onDone: (answers: string[], feedback: ReflectionFeedback | null, celebration: Celebration | null) => void }) {
  const t = useT();
  const [answers, setAnswers] = useState<string[]>(session.reflection_answers ?? session.reflection_questions.map(() => ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await postJSON<{ feedback: ReflectionFeedback | null; celebration?: Celebration }>("/api/session/reflect", { session_id: session.id, answers });
      onDone(answers, res.feedback, res.celebration ?? null);
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
              {t(q)}
            </label>
            {session.completed ? (
              <p className="rounded-xl bg-bg px-3 py-2 text-sm leading-relaxed">{t(answers[i])}</p>
            ) : (
              <VoiceTextarea
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
          {busy ? (
            <AIThinking className="w-full" steps={["Reading your reflection…", "Connecting it with today's story…", "Picking what to practise tomorrow…"]} />
          ) : (
            <>
              {error ? <Alert tone="danger">{t(error)}</Alert> : <span />}
              <Button onClick={submit} disabled={answers.some((a) => a.trim().length < 10)}>{t("Complete session")}</Button>
            </>
          )}
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
  aiVoice = null,
}: {
  session: ClientSession;
  story: Story | null;
  scenarios: ClientScenario[];
  episode?: EpisodeInfo | null;
  aiVoice?: AIVoice | null;
}) {
  const t = useT();
  const router = useRouter();
  const [session, setSession] = useState(initial);
  const [scenarios, setScenarios] = useState(initialScenarios);
  const [celebrate, setCelebrate] = useState<Celebration | null>(null);
  const [started, setStarted] = useState(initial.story_progress > 0 || initial.story_completed);
  const intro = session.introduction;
  const scenariosDone = scenarios.every((s) => s.response);
  const [challengeSeen, setChallengeSeen] = useState(session.challenge_status !== "pending" || Boolean(session.reflection_answers));
  const steps: Step[] = [
    { key: "intro", title: "Idea", minutes: "1 min", done: started },
    { key: "story", title: "Story", minutes: "10 min", done: session.story_completed },
    { key: "scenarios", title: "Scenarios", minutes: "7 min", done: scenariosDone },
    { key: "challenge", title: "Challenge", minutes: "2 min", done: session.challenge_status !== "pending" || challengeSeen },
    { key: "reflection", title: "Reflection", minutes: "3 min", done: session.completed },
  ];
  const current = !started ? 0 : !session.story_completed ? 1 : !scenariosDone ? 2 : !challengeSeen ? 3 : 4;
  const [view, setView] = useState(current);
  const top = useRef<HTMLDivElement>(null);
  const go = (i: number) => {
    setView(i);
    const el = top.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const next = view < 4 ? steps[view + 1] : null;
  const canContinue = next && steps[view].done && view !== 3;

  return (
    <div className="space-y-6">
      {session.completed && (
        <Alert tone="success">{t("Today's session is complete.")}{" "}
          {session.challenge_status === "pending" ? t("Remember to record your real-world challenge once you've tried it.") : t("See you tomorrow.")}
        </Alert>
      )}
      {session.completed && episode && <NextEpisode info={episode} />}

      <div ref={top} className="scroll-mt-20">
        <StepHeader steps={steps} view={view} current={current} onPick={go} />
      </div>

      <div key={view} className="animate-step-in space-y-4">
        {view === 0 && (
          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-semibold">{t(intro.title)}</h2>
            <div className="mt-3 rounded-xl border-l-2 border-primary bg-bg px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">{t("Key idea")}</p>
              <p className="mt-1 text-[15px] leading-relaxed">{t(intro.key_idea)}</p>
            </div>
            <details className="group mt-3 text-sm">
              <summary className="cursor-pointer list-none font-semibold text-primary">{t("Why it matters")} ›</summary>
              <p className="mt-2 leading-relaxed">{t(intro.why_it_matters)}</p>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted">{t("Today you will practise")}</p>
              <ul className="mt-1.5 space-y-1">
                {intro.what_you_will_practise.map((p, i) => (
                  <li key={i}>· {t(p)}</li>
                ))}
              </ul>
            </details>
            <Button
              className="mt-5 w-full sm:w-auto"
              onClick={() => {
                setStarted(true);
                go(1);
              }}
            >
              {started ? t("Back to the story") : t("Begin the story")} <ArrowRight className="size-4" />
            </Button>
          </Card>
        )}

        {view === 1 &&
          (story ? (
            <div className="space-y-3">
              {episode && <Previously info={episode} />}
              <StoryReader
                episode={episode}
                aiVoice={aiVoice}
                sessionId={session.id}
                story={story}
                initialProgress={session.story_progress}
                completed={session.story_completed}
                onComplete={() => setSession((s) => ({ ...s, story_completed: true, story_progress: 100 }))}
              />
            </div>
          ) : (
            <Alert tone="danger">{t("The story for this session could not be loaded.")}</Alert>
          ))}

        {view === 2 && (
          <ScenarioDeck
            sessionId={session.id}
            scenarios={scenarios}
            onAnswered={(i, updated) => {
              const nextList = scenarios.map((x, j) => (j === i ? updated : x));
              setScenarios(nextList);
              if (nextList.every((x) => x.response)) setSession((s) => ({ ...s, scenarios_completed: true }));
            }}
          />
        )}

        {view === 3 && (
          <>
            <ChallengeCard
              session={session}
              onSaved={(status, notes) => {
                setSession((s) => ({ ...s, challenge_status: status, challenge_notes: notes }));
                setChallengeSeen(true);
                router.refresh();
              }}
            />
            {!session.completed && (
              <NextStep
                to="Reflection"
                minutes={t("3 min")}
                label={session.challenge_status === "pending" ? t("Try it later today and come back to record it.") : t("Saved.")}
                cta={session.challenge_status === "pending" ? t("Later, continue") : undefined}
                onClick={() => {
                  setChallengeSeen(true);
                  go(4);
                }}
              />
            )}
          </>
        )}

        {view === 4 && (
          <ReflectionCard
            session={session}
            onDone={(answers, feedback, celebration) => {
              setSession((s) => ({ ...s, reflection_answers: answers, reflection_feedback: feedback, completed: true }));
              if (celebration) setCelebrate(celebration);
              router.refresh();
            }}
          />
        )}

        {canContinue && next && <NextStep to={next.title} minutes={next.minutes} onClick={() => go(view + 1)} />}
      </div>
      {celebrate && <CelebrationOverlay data={celebrate} onClose={() => setCelebrate(null)} />}
    </div>
  );
}
