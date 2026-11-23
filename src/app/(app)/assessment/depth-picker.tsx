"use client";

import { assessLang, type Language } from "@/lib/domain/languages";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Gauge, Layers, ListChecks, Zap } from "lucide-react";
import { Alert, Button, Spinner, cx } from "@/components/ui";
import { DEPTHS, DEPTH_INFO, type AssessmentDepth } from "@/lib/domain/assessment";
import { depthCopy } from "@/lib/domain/assessment-depth-i18n";
import { postJSON } from "@/lib/client/api";

const ICONS = { quick: Zap, standard: Gauge, deep: Layers };
const TONES = { quick: "bg-sun-soft text-warning", standard: "bg-primary-soft text-primary", deep: "bg-accent-soft text-accent" };

export function DepthPicker({ language, current, onCancel }: { language: Language; current?: AssessmentDepth; onCancel?: () => void }) {
  const t = depthCopy(assessLang(language));
  const router = useRouter();
  const [choice, setChoice] = useState<AssessmentDepth>(current ?? "standard");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      await postJSON("/api/assessment/start", { depth: choice });
      onCancel?.();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-extrabold">{t.pickTitle}</h2>
        <p className="mt-1 text-sm text-muted">{t.pickHint}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3" role="radiogroup" aria-label={t.pickTitle}>
        {DEPTHS.map((d) => {
          const Icon = ICONS[d];
          const info = DEPTH_INFO[d];
          const c = t.depths[d];
          const on = choice === d;
          return (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setChoice(d)}
              className={cx(
                "relative rounded-2xl border bg-surface p-4 text-left shadow-card transition",
                on ? "border-primary ring-4 ring-primary/10" : "border-line hover:-translate-y-0.5 hover:shadow-raised",
              )}
            >
              {d === "standard" && (
                <span className="absolute right-3 top-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">{t.recommended}</span>
              )}
              <span className={cx("flex size-10 items-center justify-center rounded-xl", TONES[d])}>
                <Icon className="size-5" />
              </span>
              <p className="mt-3 font-extrabold">{c.name}</p>
              <p className="text-xs font-semibold text-muted">{c.tagline}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="inline-flex items-center gap-1 rounded-full bg-bg px-2 py-0.5">
                  <ListChecks className="size-3.5" /> {t.questions(info.questions)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-bg px-2 py-0.5">
                  <Clock className="size-3.5" /> {t.minutes(info.minutes)}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">{c.detail}</p>
            </button>
          );
        })}
      </div>
      {error && <Alert tone="danger">{error}</Alert>}
      <div className="flex gap-2">
        <Button onClick={start} disabled={busy}>
          {busy && <Spinner />} {t.start}: {t.depths[choice].name}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            ✕
          </Button>
        )}
      </div>
    </div>
  );
}
