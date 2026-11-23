"use client";

import { useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui";
import { useT } from "@/lib/i18n/client";
import { resetPersonaAction } from "./actions";

export function ResetPersona() {
  const t = useT();
  const [sure, setSure] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  if (done) return <p className="text-sm text-muted">{t("Done. Your persona starts fresh from your next activity.")}</p>;
  return sure ? (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm">{t("Delete all signals and start fresh?")}</span>
      <Button variant="danger" disabled={pending} onClick={() => start(async () => { await resetPersonaAction(); setDone(true); })}>
        {t("Yes, delete")}
      </Button>
      <Button variant="ghost" onClick={() => setSure(false)}>{t("Cancel")}</Button>
    </div>
  ) : (
    <Button variant="secondary" onClick={() => setSure(true)}>
      <RotateCcw className="size-4" /> {t("Reset my persona")}
    </Button>
  );
}
