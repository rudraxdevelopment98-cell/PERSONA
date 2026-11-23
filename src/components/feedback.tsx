"use client";

import { ChevronDown, Lightbulb, MessageSquareQuote, Sparkles, ThumbsUp, TrendingUp, Wand2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { IconTile } from "./ui";
import { useT } from "@/lib/i18n/client";

type Concept = { name: string; explanation: string } | undefined;

function Row({ icon, tone, label, children }: { icon: ReactNode; tone: "accent" | "sun" | "sky" | "coral" | "primary"; label: string; children: ReactNode }) {
  const t = useT();
  return (
    <div className="flex gap-3">
      <IconTile tone={tone} size="sm">
        {icon}
      </IconTile>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">{t(label)}</p>
        <div className="mt-0.5 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

/** Rich, specific feedback: quote, what worked, what to change, the concept, a model answer and a drill. */
export function DeepFeedback(props: {
  yourWords?: string;
  wentWell?: string;
  toImprove?: string;
  concept?: Concept;
  conceptLabel?: string;
  example?: string;
  exampleLabel?: string;
  extra?: { label: string; text?: string }[];
  practiseNext?: string;
  /** Shown first: e.g. a score line. */
  headline?: ReactNode;
  /** Extra detail shown only when the person opens "full feedback". */
  details?: ReactNode;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const hasMore = Boolean(props.yourWords || props.concept?.name || props.example || props.extra?.some((e) => e.text) || props.practiseNext || props.details);
  return (
    <div className="space-y-4">
      {props.headline}
      {props.wentWell && (
        <Row icon={<ThumbsUp className="size-4" />} tone="accent" label={t("What worked")}>
          {t(props.wentWell)}
        </Row>
      )}
      {props.toImprove && (
        <Row icon={<TrendingUp className="size-4" />} tone="coral" label={t("To level up")}>
          {t(props.toImprove)}
        </Row>
      )}
      {hasMore && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2.5 text-sm font-semibold text-primary hover:bg-surface"
        >
          {t("See full feedback")} <ChevronDown className="size-4" />
        </button>
      )}
      {open && props.details}
      {open && props.yourWords && (
        <blockquote className="flex gap-2 rounded-xl border-l-4 border-primary bg-surface px-4 py-3 text-sm italic">
          <MessageSquareQuote className="mt-0.5 size-4 shrink-0 not-italic text-primary" />{t("“")}{t(props.yourWords)}{t("”")}</blockquote>
      )}
      {open && props.concept?.name && (
        <div className="rounded-2xl bg-sky-soft p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-sky">
            <Lightbulb className="size-3.5" /> {t(props.conceptLabel ?? "") || t("Psychology behind it")}
          </p>
          <p className="mt-1 font-bold">{props.concept.name}</p>
          <p className="mt-0.5 text-sm leading-relaxed">{t(props.concept.explanation)}</p>
        </div>
      )}
      {open && props.example && (
        <Row icon={<Wand2 className="size-4" />} tone="primary" label={t(props.exampleLabel ?? "") || t("How a skilled person might think")}>
          <p className="whitespace-pre-line">{t(props.example)}</p>
        </Row>
      )}
      {open && props.extra?.filter((e) => e.text).map((e) => (
        <Row key={e.label} icon={<Sparkles className="size-4" />} tone="sky" label={t(e.label)}>
          {e.text}
        </Row>
      ))}
      {open && props.practiseNext && (
        <div className="rounded-2xl bg-sun-soft p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-warning">{t("Practise this week")}</p>
          <p className="mt-0.5 text-sm leading-relaxed">{t(props.practiseNext)}</p>
        </div>
      )}
    </div>
  );
}
