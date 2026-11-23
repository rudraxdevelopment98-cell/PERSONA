"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Compass } from "lucide-react";
import { LIFE_AREAS, LIFE_STAGES } from "@/lib/domain/life";
import { Alert, Button, cx } from "./ui";

/**
 * "Tum abhi kya karte ho?" + "Kin areas mein grow karna hai?". Stories, scenarios and
 * labs then come from these parts of life instead of defaulting to office situations.
 */
export function LifePicker({
  initialStage = null,
  initialAreas = [],
  variant = "card",
}: {
  initialStage?: string | null;
  initialAreas?: string[];
  variant?: "card" | "plain";
}) {
  const router = useRouter();
  const [stage, setStage] = useState<string | null>(initialStage);
  const [areas, setAreas] = useState<string[]>(initialAreas);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const toggle = (id: string) => setAreas((a) => (a.includes(id) ? a.filter((x) => x !== id) : a.length >= 4 ? a : [...a, id]));

  const save = async () => {
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/life", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ stage, areas }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setMsg({ tone: "danger", text: j.error ?? "Save nahi hua." });
    setMsg({ tone: "success", text: "Saved! Ab kahaniyan aur practice in areas se aayenge." });
    router.refresh();
  };

  const body = (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-semibold">Tum abhi kya karte ho?</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {LIFE_STAGES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStage(s.id)}
              aria-pressed={stage === s.id}
              className={cx("flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-sm transition", stage === s.id ? "border-primary bg-primary-soft font-semibold" : "border-line hover:bg-bg")}
            >
              <span aria-hidden>{s.emoji}</span>
              <span className="min-w-0">{s.hi}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">
          Kin areas mein grow karna hai? <span className="font-normal text-muted">(1–4 chuno)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {LIFE_AREAS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => toggle(a.id)}
              aria-pressed={areas.includes(a.id)}
              className={cx("rounded-full border px-3.5 py-2 text-sm transition", areas.includes(a.id) ? "border-accent bg-accent-soft font-semibold text-ink" : "border-line hover:bg-bg")}
            >
              <span aria-hidden>{a.emoji}</span> {a.hi}
            </button>
          ))}
        </div>
      </div>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <Button onClick={save} disabled={busy || !stage || areas.length === 0}>
        {busy ? "Saving…" : "Save"}
      </Button>
    </div>
  );

  if (variant === "plain") return body;
  return (
    <section aria-label="Tumhari life" className="rounded-3xl border border-line bg-surface p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Compass className="size-5" />
        </span>
        <div>
          <p className="font-bold">Tumhari life, tumhari kahaniyan · 20 sec</p>
          <p className="text-sm text-muted">Bata do, taaki roz ki kahaniyan aur practice tumhari zindagi se judi ho: ghar, dost, padhai, kaam, rishte…</p>
        </div>
      </div>
      {body}
    </section>
  );
}
