"use client";

import { languageInfo, type Language } from "@/lib/domain/languages";
import { AIThinking } from "@/components/ai-thinking";
import { UpgradeHint, isUpgradeError } from "@/components/upgrade";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Gauge, Keyboard, Mic, MicOff, RotateCcw, Timer, Waves } from "lucide-react";
import { DeepFeedback } from "@/components/feedback";
import { RubricTable } from "@/components/rubric";
import { Alert, Badge, Button, Card, CardHeader, Label, Spinner, cx } from "@/components/ui";
import type { CommunicationEvaluation, CommunicationPrompt } from "@/lib/ai/schemas";
import { postJSON } from "@/lib/client/api";
import { useSpeech } from "@/lib/client/use-speech";
import { COMMUNICATION_EXERCISES, EXERCISE_BY_ID } from "@/lib/domain/labs";
import type { SpeechMetrics } from "@/lib/domain/speech";
import { VoiceTextarea } from "@/components/voice-input";
import { useT } from "@/lib/i18n/client";

type Pending = { id: string; exercise_type: string; prompt: CommunicationPrompt };
const LABELS = { clarity: "Clarity", assertiveness: "Assertiveness", empathy: "Empathy", composure: "Composure" };
const TONES = ["coral", "sky", "accent", "sun", "primary", "coral", "sky"] as const;

function MetricsRow({ m }: { m: SpeechMetrics }) {
  const t = useT();
  const paceTone = m.wpm === 0 ? "text-muted" : m.wpm < 100 ? "text-warning" : m.wpm > 175 ? "text-warning" : "text-success";
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="rounded-xl bg-surface p-3 text-center">
        <Gauge className="mx-auto size-4 text-muted" />
        <p className={cx("mt-1 text-lg font-extrabold tabular-nums", paceTone)}>{Math.round(m.wpm)}</p>
        <p className="text-[11px] text-muted">{t("words / min")}</p>
      </div>
      <div className="rounded-xl bg-surface p-3 text-center">
        <Waves className="mx-auto size-4 text-muted" />
        <p className={cx("mt-1 text-lg font-extrabold tabular-nums", m.filler_count > 3 ? "text-warning" : "text-success")}>{m.filler_count}</p>
        <p className="text-[11px] text-muted">{t("filler words")}</p>
      </div>
      <div className="rounded-xl bg-surface p-3 text-center">
        <Timer className="mx-auto size-4 text-muted" />
        <p className="mt-1 text-lg font-extrabold tabular-nums">{t("{0}s", Math.round(m.duration_ms / 1000))}</p>
        <p className="text-[11px] text-muted">{t("speaking time")}</p>
      </div>
    </div>
  );
}

export function CommunicationLab({
  stats,
  pending,
  language,
}: {
  stats: { id: string; count: number; avg: number | null }[];
  pending: Pending | null;
  language: Language;
}) {
  const t = useT();
  const router = useRouter();
  const [current, setCurrent] = useState<Pending | null>(pending);
  const [mode, setMode] = useState<"text" | "voice">("voice");
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<{ evaluation: CommunicationEvaluation; score: number; metrics: SpeechMetrics | null; reply: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState(false);
  const speech = useSpeech(language === "hinglish" ? "en-IN" : languageInfo(language).speech);
  const voiceMode = mode === "voice" && speech.supported;
  const spoken = `${speech.transcript} ${speech.interim}`.trim();
  const reply = voiceMode ? speech.transcript : typed;

  async function start(type: string) {
    setBusy(type);
    setError(null);
    try {
      const res = await postJSON<{ id: string; prompt: CommunicationPrompt }>("/api/communication/new", { exercise_type: type });
      setCurrent({ id: res.id, exercise_type: type, prompt: res.prompt });
      setTyped("");
      speech.reset();
      setResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the exercise.");
      setUpgrade(isUpgradeError(e));
    } finally {
      setBusy(null);
    }
  }

  async function submit() {
    if (!current) return;
    if (speech.listening) speech.stop();
    setBusy("submit");
    setError(null);
    try {
      const text = reply.trim();
      const metrics = voiceMode ? speech.metrics(text) : null;
      const res = await postJSON<{ evaluation: CommunicationEvaluation; score: number }>("/api/communication/submit", {
        id: current.id,
        response: text,
        input_mode: voiceMode ? "voice" : "text",
        speech: metrics,
      });
      setResult({ ...res, metrics, reply: text });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {COMMUNICATION_EXERCISES.map((e, i) => {
          const s = stats.find((x) => x.id === e.id);
          const active = current?.exercise_type === e.id;
          return (
            <button
              key={e.id}
              onClick={() => start(e.id)}
              disabled={busy !== null}
              className={cx(
                "rounded-2xl border-2 bg-surface p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-raised disabled:opacity-60",
                active ? "border-primary" : "border-transparent",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <Badge tone={TONES[i % TONES.length]}>{s?.count ? t("{0} done", s.count) : t("New")}</Badge>
                {busy === e.id && <Spinner className="text-muted" />}
              </div>
              <p className="mt-2 text-sm font-bold">{t(e.label)}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{t(e.description)}</p>
              {s?.avg != null && <p className="mt-2 text-xs font-semibold text-accent">{t("Avg {0}/100", s.avg)}</p>}
            </button>
          );
        })}
      </div>

      {error && !current && (
        <div>
          <Alert tone={upgrade ? "warning" : "danger"}>{t(error)}</Alert>
          <UpgradeHint show={upgrade} />
        </div>
      )}

      {current && (
        <Card className="animate-rise">
          <CardHeader
            title={t(current.prompt.title)}
            description={t(EXERCISE_BY_ID.get(current.exercise_type)?.label ?? "")}
            action={result ? <Badge tone="accent">{result.score}/100</Badge> : undefined}
          />
          <div className="space-y-4 px-5 pb-5 pt-3">
            <p className="text-sm leading-relaxed">{t(current.prompt.setting)}</p>
            <div className="flex gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-coral-soft text-sm font-bold text-coral">
                {current.prompt.other_person.slice(0, 1)}
              </span>
              <div className="rounded-2xl rounded-tl-sm bg-bg px-4 py-3">
                <p className="text-xs font-semibold text-muted">{t(current.prompt.other_person)}</p>
                <p className="mt-1 text-[15px] leading-relaxed">&ldquo;{t(current.prompt.they_say)}&rdquo;</p>
              </div>
            </div>
            <p className="rounded-xl bg-accent-soft px-4 py-2.5 text-sm">
              <span className="font-bold text-accent">{t("Your goal:")}</span> {t(current.prompt.your_goal)}
            </p>

            {!result ? (
              <>
                <div className="inline-flex rounded-full bg-primary-soft p-1">
                  {(["voice", "text"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        if (speech.listening) speech.stop();
                        setMode(m);
                      }}
                      aria-pressed={mode === m}
                      className={cx(
                        "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition",
                        mode === m ? "bg-surface text-primary shadow-card" : "text-muted",
                      )}
                    >
                      {m === "voice" ? <Mic className="size-4" /> : <Keyboard className="size-4" />}
                      {m === "voice" ? t("Speak") : t("Type")}
                    </button>
                  ))}
                </div>

                {mode === "voice" && !speech.supported && (
                  <Alert tone="warning">{t("Voice practice needs Chrome, Edge or Safari. You can type your reply instead.")}</Alert>
                )}

                {voiceMode ? (
                  <div className="rounded-2xl bg-bg p-5 text-center">
                    <button
                      type="button"
                      onClick={() => (speech.listening ? speech.stop() : speech.start())}
                      aria-label={speech.listening ? t("Stop recording") : t("Start speaking")}
                      className={cx(
                        "relative mx-auto flex size-20 items-center justify-center rounded-full text-white shadow-raised transition active:scale-95",
                        speech.listening ? "bg-coral" : "bg-primary",
                      )}
                    >
                      {speech.listening && <span className="absolute inset-0 animate-ping rounded-full bg-coral/40" />}
                      {speech.listening ? <MicOff className="relative size-8" /> : <Mic className="size-8" />}
                    </button>
                    <p className="mt-3 text-sm font-semibold">{speech.listening ? t("Listening… tap to stop") : spoken ? t("Tap to continue speaking") : t("Tap and say your reply out loud")}</p>
                    <p className="text-xs text-muted">{t("Speak as you would in real life. Pace and filler words are measured on your device.")}</p>
                    {spoken && (
                      <div className="mt-4 rounded-xl bg-surface p-4 text-left text-sm leading-relaxed">
                        {speech.transcript}
                        {speech.interim && <span className="text-muted"> {t(speech.interim)}</span>}
                      </div>
                    )}
                    {speech.transcript && !speech.listening && (
                      <div className="mt-3 flex flex-wrap justify-center gap-2">
                        <Button variant="ghost" onClick={speech.reset}>
                          <RotateCcw className="size-4" />{" "}{t("Start over")}</Button>
                        <Button variant="secondary" onClick={() => { setTyped(speech.transcript); setMode("text"); }}>
                          <Keyboard className="size-4" />{" "}{t("Fix the transcript")}</Button>
                      </div>
                    )}
                    {speech.error && <div className="mt-3"><Alert tone="warning">{t(speech.error)}</Alert></div>}
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="reply">{t("What do you say? Write it exactly as you would say it.")}</Label>
                    <VoiceTextarea id="reply" rows={4} maxLength={3000} value={typed} onChange={(e) => setTyped(e.target.value)} />
                  </div>
                )}

                {error && <Alert tone="danger">{t(error)}</Alert>}
                {busy === "submit" ? (
                  <AIThinking steps={["Listening to your words…", "Checking tone, clarity and respect…", "Writing a stronger version…"]} />
                ) : (
                  <div className="flex justify-end">
                    <Button onClick={submit} disabled={reply.trim().length < 10 || busy !== null}>{t("Get feedback")}</Button>
                  </div>
                )}
              </>
            ) : (
              <div className="animate-pop space-y-4 rounded-2xl bg-bg p-4">
                <RubricTable rubric={result.evaluation.rubric} labels={LABELS} />
                {result.metrics && <MetricsRow m={result.metrics} />}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-surface p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted">{t("You said")}</p>
                    <p className="mt-1 text-sm leading-relaxed">{result.reply}</p>
                  </div>
                  <div className="rounded-xl border-2 border-accent/30 bg-accent-soft p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-accent">{t("Stronger version")}</p>
                    <p className="mt-1 text-sm leading-relaxed">{t(result.evaluation.stronger_version)}</p>
                  </div>
                </div>
                <DeepFeedback
                  yourWords={result.evaluation.your_words}
                  wentWell={result.evaluation.what_went_well}
                  toImprove={result.evaluation.to_improve}
                  concept={result.evaluation.technique}
                  conceptLabel={t("Technique to use")}
                  extra={[
                    { label: "Why the stronger version works", text: result.evaluation.why_it_works },
                    { label: "Your delivery", text: result.evaluation.delivery_feedback },
                  ]}
                  practiseNext={result.evaluation.practise_next}
                />
                <Button variant="secondary" onClick={() => start(current.exercise_type)} disabled={busy !== null}>
                  <RotateCcw className="size-4" />{" "}{t("Another one")}</Button>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
