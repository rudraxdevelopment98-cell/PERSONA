"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Alert, Button, Card, Label, ProgressBar, Spinner, Textarea, cx } from "@/components/ui";
import { ASSESSMENT_ITEMS, LIKERT_SCALE, type AssessmentItem } from "@/lib/domain/assessment";
import { DIMENSION_META } from "@/lib/domain/dimensions";
import { postJSON } from "@/lib/client/api";

const PAGE_SIZE = 5;

function Question({
  item,
  value,
  pickedIndex,
  onChange,
  index,
}: {
  item: AssessmentItem;
  value?: number;
  pickedIndex?: number;
  onChange: (v: number, optionIndex: number) => void;
  index: number;
}) {
  const options = item.kind === "likert" ? LIKERT_SCALE.map((s) => ({ value: s.value, label: s.label })) : item.options;
  return (
    <fieldset className="py-5 first:pt-0 last:pb-0">
      <legend className="mb-3 text-sm leading-relaxed text-ink">
        <span className="mr-2 text-muted tabular-nums">{index}.</span>
        {item.text}
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

export function AssessmentWizard({ initial }: { initial: Record<string, number> }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, number>>(initial);
  // Situational items can share option values, so remember which option index was picked.
  const [picked, setPicked] = useState<Record<string, number>>({});
  const pages = useMemo(() => {
    const out: AssessmentItem[][] = [];
    for (let i = 0; i < ASSESSMENT_ITEMS.length; i += PAGE_SIZE) out.push(ASSESSMENT_ITEMS.slice(i, i + PAGE_SIZE));
    return out;
  }, []);
  const firstIncomplete = pages.findIndex((p) => p.some((i) => answers[i.id] == null));
  const [page, setPage] = useState(firstIncomplete === -1 ? pages.length : firstIncomplete);
  const [heldBack, setHeldBack] = useState("");
  const [goal, setGoal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const answered = Object.keys(answers).length;
  const isReflection = page === pages.length;

  async function answer(item: AssessmentItem, value: number, optionIndex: number) {
    const prev = answers[item.id];
    setAnswers((a) => ({ ...a, [item.id]: value }));
    setPicked((p) => ({ ...p, [item.id]: optionIndex }));
    try {
      await postJSON("/api/assessment/answer", { question_id: item.id, value });
      setError(null);
    } catch (e) {
      setAnswers((a) => {
        const next = { ...a };
        if (prev == null) delete next[item.id];
        else next[item.id] = prev;
        return next;
      });
      setError(e instanceof Error ? e.message : "Could not save your answer.");
    }
  }

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      await postJSON("/api/assessment/complete", { held_back: heldBack, goal });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not complete the assessment.");
      setBusy(false);
    }
  }

  const current = pages[page] ?? [];
  const pageComplete = current.every((i) => answers[i.id] != null);
  const dims = [...new Set(current.map((i) => DIMENSION_META[i.dimension].label))];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <ProgressBar value={(answered / (ASSESSMENT_ITEMS.length + 1)) * 100} />
        <span className="shrink-0 text-xs tabular-nums text-muted">
          {answered}/{ASSESSMENT_ITEMS.length}
        </span>
      </div>

      <Card className="p-5 sm:p-6">
        {!isReflection ? (
          <>
            <p className="mb-5 text-xs font-medium uppercase tracking-wide text-muted">
              Part {page + 1} of {pages.length + 1} · {dims.join(" · ")}
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
                    onChange={(v, idx) => answer(item, v, idx)}
                  />
                );
              })}
            </div>
          </>
        ) : (
          <div className="space-y-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Final part · In your own words</p>
            <div>
              <Label htmlFor="held">Describe a recent situation where you held back from saying or doing something. What stopped you?</Label>
              <Textarea id="held" value={heldBack} onChange={(e) => setHeldBack(e.target.value)} maxLength={2000} rows={4} />
            </div>
            <div>
              <Label htmlFor="goal">What would you like to be noticeably different about how you think or act after 90 days?</Label>
              <Textarea id="goal" value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={2000} rows={4} />
            </div>
            <p className="text-xs text-muted">These answers personalise your profile and stories. They are never shared.</p>
          </div>
        )}
      </Card>

      {error && <Alert tone="danger">{error}</Alert>}

      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || busy}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        {!isReflection ? (
          <Button onClick={() => setPage((p) => p + 1)} disabled={!pageComplete}>
            Continue <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button onClick={finish} disabled={busy || heldBack.trim().length < 10 || goal.trim().length < 10 || answered < ASSESSMENT_ITEMS.length}>
            {busy ? <Spinner /> : <Check className="size-4" />} {busy ? "Building your profile…" : "Finish assessment"}
          </Button>
        )}
      </div>
    </div>
  );
}
