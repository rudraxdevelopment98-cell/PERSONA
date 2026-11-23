"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CloudCheck, History, Layers, SlidersHorizontal } from "lucide-react";
import { Alert, Button, Card, Label, ProgressBar, Spinner, cx } from "@/components/ui";
import { DEPTH_INFO, LIKERT_SCALE, itemsForDepth, type AssessmentDepth, type AssessmentItem } from "@/lib/domain/assessment";
import { depthCopy } from "@/lib/domain/assessment-depth-i18n";
import { DepthPicker } from "./depth-picker";
import { DIMENSION_META } from "@/lib/domain/dimensions";
import { assessmentPack, type AssessmentLang } from "@/lib/domain/assessment-i18n";
import { postJSON } from "@/lib/client/api";
import { VoiceTextarea } from "@/components/voice-input";

const PAGE_SIZE = 5;
const DRAFT_KEY = "persona90-assessment-draft";

function Question({
  item,
  value,
  pickedIndex,
  onChange,
  index,
  lang,
}: {
  lang: AssessmentLang;
  item: AssessmentItem;
  value?: number;
  pickedIndex?: number;
  onChange: (v: number, optionIndex: number) => void;
  index: number;
}) {
  const pack = assessmentPack(lang);
  const t = pack?.items[item.id];
  const options =
    item.kind === "likert"
      ? LIKERT_SCALE.map((s, i) => ({ value: s.value, label: pack?.likert[i] ?? s.label }))
      : item.options.map((o, i) => ({ value: o.value, label: t?.options?.[i] ?? o.label }));
  return (
    <fieldset className="py-5 first:pt-0 last:pb-0">
      <legend className="mb-3 text-sm leading-relaxed text-ink">
        <span className="mr-2 text-muted tabular-nums">{index}.</span>
        {t?.text ?? item.text}
      </legend>
      <div className={cx("grid gap-2", item.kind === "likert" ? "grid-cols-1 sm:grid-cols-5" : "grid-cols-1")}>
        {options.map((o, i) => {
          // Situational options can share a value; prefer the exact option clicked this visit.
          const selected =
            item.kind === "likert" || pickedIndex == null
              ? value === o.value && (item.kind === "likert" || item.options.findIndex((x) => x.value === value) === i)
              : pickedIndex === i;
          return (
            <button
              type="button"
              key={`${o.value}-${i}`}
              onClick={() => onChange(o.value, i)}
              aria-pressed={selected}
              className={cx(
                "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                item.kind === "likert" && "sm:text-center",
                selected ? "border-primary bg-primary-soft font-medium text-ink" : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function AssessmentWizard({
  initial,
  language = "en",
  depth = "deep",
  mode = "baseline",
  askHeldBack = true,
}: {
  initial: Record<string, number>;
  language?: AssessmentLang;
  depth?: AssessmentDepth;
  /** "deepen" adds the extra questions of a deeper level to a completed baseline. */
  mode?: "baseline" | "deepen";
  askHeldBack?: boolean;
}) {
  const pack = assessmentPack(language);
  const ui = pack?.ui;
  const t = depthCopy(language);
  const router = useRouter();
  const [changing, setChanging] = useState(false);
  const ITEMS = useMemo(
    () => (mode === "deepen" ? itemsForDepth(depth).filter((i) => initial[i.id] == null) : itemsForDepth(depth)),
    // The question set is fixed for this visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [depth, mode],
  );
  const heldBackRequired = mode === "baseline" && DEPTH_INFO[depth].heldBackRequired;
  const showHeldBack = mode === "baseline" || askHeldBack;
  const [answers, setAnswers] = useState<Record<string, number>>(initial);
  // Situational items can share option values, so remember which option index was picked.
  const [picked, setPicked] = useState<Record<string, number>>({});
  const pages = useMemo(() => {
    const out: AssessmentItem[][] = [];
    for (let i = 0; i < ITEMS.length; i += PAGE_SIZE) out.push(ITEMS.slice(i, i + PAGE_SIZE));
    return out;
  }, [ITEMS]);
  const firstIncomplete = pages.findIndex((p) => p.some((i) => answers[i.id] == null));
  const [page, setPage] = useState(firstIncomplete === -1 ? pages.length : firstIncomplete);
  const [heldBack, setHeldBack] = useState("");
  const [goal, setGoal] = useState("");
  const [saving, setSaving] = useState(0);
  const resumed = useRef(mode === "baseline" && Object.keys(initial).length > 0);
  // Saves run one after another, in click order, so answers can never race.
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  // Reflection drafts are kept in this browser until the assessment is finished.
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}");
      if (typeof d.heldBack === "string") setHeldBack(d.heldBack);
      if (typeof d.goal === "string") setGoal(d.goal);
    } catch {
      /* storage unavailable */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ heldBack, goal }));
    } catch {
      /* storage unavailable */
    }
  }, [heldBack, goal]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const answered = ITEMS.filter((i) => answers[i.id] != null).length;
  const isReflection = page === pages.length;

  async function answer(item: AssessmentItem, value: number, optionIndex: number) {
    const prev = answers[item.id];
    setAnswers((a) => ({ ...a, [item.id]: value }));
    setPicked((p) => ({ ...p, [item.id]: optionIndex }));
    setSaving((n) => n + 1);
    const save = queue.current.catch(() => {}).then(() => postJSON("/api/assessment/answer", { question_id: item.id, value }));
    queue.current = save;
    try {
      await save;
      setError(null);
    } catch (e) {
      setAnswers((a) => {
        const next = { ...a };
        if (prev == null) delete next[item.id];
        else next[item.id] = prev;
        return next;
      });
      setError(e instanceof Error ? e.message : "Could not save your answer.");
    } finally {
      setSaving((n) => n - 1);
    }
  }

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      await queue.current.catch(() => {});
      if (mode === "deepen") await postJSON("/api/assessment/upgrade", { depth, held_back: heldBack || undefined });
      else await postJSON("/api/assessment/complete", { held_back: heldBack, goal });
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* storage unavailable */
      }
      if (mode === "deepen") router.replace("/assessment");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not complete the assessment.");
      setBusy(false);
    }
  }

  const current = pages[page] ?? [];
  const pageComplete = current.every((i) => answers[i.id] != null);
  const dims = [...new Set(current.map((i) => pack?.dimensions[i.dimension] ?? DIMENSION_META[i.dimension].label))];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <ProgressBar value={(answered / (ITEMS.length + 1)) * 100} />
        <span className="shrink-0 text-xs tabular-nums text-muted">
          {answered}/{ITEMS.length}
        </span>
        <span className="inline-flex w-20 shrink-0 items-center justify-end gap-1 text-xs font-semibold text-muted" aria-live="polite">
          {saving > 0 ? (
            (ui?.saving ?? "Saving…")
          ) : answered > 0 ? (
            <>
              <CloudCheck className="size-3.5 text-success" /> {ui?.saved ?? "Saved"}
            </>
          ) : null}
        </span>
      </div>

      {mode === "baseline" && !changing && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm">
          <span className="inline-flex items-center gap-2 font-semibold">
            <Layers className="size-4 text-primary" /> {t.lengthLabel(depth)}
          </span>
          <button type="button" onClick={() => setChanging(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            <SlidersHorizontal className="size-3.5" /> {t.changeLength}
          </button>
        </div>
      )}
      {mode === "deepen" && (
        <div className="flex items-center gap-2 rounded-xl bg-primary-soft px-4 py-2.5 text-sm font-semibold text-primary">
          <Layers className="size-4 shrink-0" /> {t.deeperIntro(depth, ITEMS.length)}
        </div>
      )}
      {changing && (
        <Card className="p-5">
          <DepthPicker language={language} current={depth} onCancel={() => setChanging(false)} />
        </Card>
      )}

      {resumed.current && (
        <div className="flex items-center gap-2 rounded-xl bg-accent-soft px-4 py-2.5 text-sm">
          <History className="size-4 shrink-0 text-accent" />
          {ui ? ui.welcomeBack(Object.keys(initial).length) : `Welcome back - your ${Object.keys(initial).length} earlier answers are saved. Continue where you left off.`}
        </div>
      )}

      <Card className="p-5 sm:p-6">
        {!isReflection ? (
          <>
            <p className="mb-5 text-xs font-medium uppercase tracking-wide text-muted">
              {ui?.part ?? "Part"} {page + 1} {ui?.of ?? "of"} {pages.length + 1} · {dims.join(" · ")}
            </p>
            <div className="divide-y divide-line">
              {current.map((item, i) => {
                const value = answers[item.id];
                return (
                  <Question
                    key={item.id}
                    item={item}
                    index={page * PAGE_SIZE + i + 1}
                    value={value}
                    pickedIndex={picked[item.id]}
                    lang={language}
                    onChange={(v, idx) => answer(item, v, idx)}
                  />
                );
              })}
            </div>
          </>
        ) : (
          <div className="space-y-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">{ui?.finalPart ?? "Final part · In your own words"}</p>
            {showHeldBack && (
              <div>
                <Label htmlFor="held">
                  {ui?.heldBack ?? "Describe a recent situation where you held back from saying or doing something. What stopped you?"}
                  {!heldBackRequired && <span className="ml-1 font-normal text-muted">{t.optional}</span>}
                </Label>
                <VoiceTextarea id="held" value={heldBack} onChange={(e) => setHeldBack(e.target.value)} maxLength={2000} rows={4} />
              </div>
            )}
            {mode === "baseline" && (
              <div>
                <Label htmlFor="goal">{ui?.goal ?? "What would you like to be noticeably different about how you think or act after 90 days?"}</Label>
                <VoiceTextarea id="goal" value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={2000} rows={4} />
              </div>
            )}
            <p className="text-xs text-muted">{ui?.privateNote ?? "These answers personalise your profile and stories. They are never shared."}</p>
          </div>
        )}
      </Card>

      {error && <Alert tone="danger">{error}</Alert>}

      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || busy}>
          <ArrowLeft className="size-4" /> {ui?.back ?? "Back"}
        </Button>
        {!isReflection ? (
          <Button onClick={() => setPage((p) => p + 1)} disabled={!pageComplete}>
            {ui?.continue ?? "Continue"} <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button
            onClick={finish}
            disabled={
              busy ||
              answered < ITEMS.length ||
              (heldBackRequired && heldBack.trim().length < 10) ||
              (heldBack.trim().length > 0 && heldBack.trim().length < 10) ||
              (mode === "baseline" && goal.trim().length < 10)
            }
          >
            {busy ? <Spinner /> : <Check className="size-4" />} {busy ? (ui?.building ?? "Building your profile…") : (ui?.finish ?? "Finish assessment")}
          </Button>
        )}
      </div>
    </div>
  );
}
