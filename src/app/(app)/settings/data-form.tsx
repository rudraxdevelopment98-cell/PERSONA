"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { Alert, Button, Input } from "@/components/ui";
import { deleteAccount } from "./actions";
import { useT } from "@/lib/i18n/client";

/** Export and delete account. */
export function DataForm() {
  const t = useT();
  const [confirm, setConfirm] = useState("");
  const [delError, setDelError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">{t("Export all data")}</p>
          <p className="text-sm text-muted">{t("Download a JSON file with your assessment, check-ins, sessions, scores, journal and coach history.")}</p>
        </div>
        <a href="/api/export" className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-line bg-surface px-3.5 text-sm font-medium hover:bg-bg">
          <Download className="size-4" /> {t("Export")}
        </a>
      </div>
      <details className="border-t border-line pt-4">
        <summary className="cursor-pointer list-none text-sm font-medium text-danger">{t("Delete account")} ›</summary>
        <p className="mt-2 text-sm text-muted">{t("Permanently deletes your account and all associated data. This cannot be undone. Type DELETE to confirm.")}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={t("DELETE")} className="sm:w-48" aria-label={t("Type DELETE to confirm")} />
          <Button variant="danger" disabled={confirm !== "DELETE" || deleting} onClick={() => startDelete(async () => { const r = await deleteAccount(confirm); if (r?.error) setDelError(r.error); })}>
            {t("Delete my account")}
          </Button>
        </div>
        {delError && <div className="mt-3"><Alert tone="danger">{t(delError)}</Alert></div>}
      </details>
    </div>
  );
}

/** Coach-reads-journal privacy toggle. */
export function CoachJournalToggle({ initial }: { initial: boolean }) {
  const t = useT();
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  const toggle = (next: boolean) => {
    setOn(next);
    start(async () => {
      const { setCoachJournal } = await import("./actions");
      await setCoachJournal(next);
    });
  };
  return (
    <label className="flex items-start gap-3">
      <input type="checkbox" checked={on} disabled={pending} onChange={(e) => toggle(e.target.checked)} className="mt-1 size-4 accent-primary" />
      <span>
        <span className="block text-sm font-medium">{t("Let the AI Coach read my recent journal entries")}</span>
        <span className="block text-sm text-muted">{t("Off by default. When on, your five most recent entries are included when you message the coach, so its advice can reflect them. Entries are never used anywhere else.")}</span>
      </span>
    </label>
  );
}
