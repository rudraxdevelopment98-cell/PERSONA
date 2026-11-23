"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { Alert, Button, Card, CardHeader, Input, Label, Select, Spinner } from "@/components/ui";
import { LANGUAGE_LABELS, type Language } from "@/lib/ai/prompts";
import { deleteAccount, setLanguage, updateSettings } from "./actions";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/client";

export function SettingsForm(props: {
  email: string;
  displayName: string;
  timezone: string;
  coachJournalAccess: boolean;
  startDate: string | null;
  language: Language;
}) {
  const t = useT();
  const router = useRouter();
  const [switching, startSwitch] = useTransition();
  const [name, setName] = useState(props.displayName);
  const [tz, setTz] = useState(props.timezone);
  const [journal, setJournal] = useState(props.coachJournalAccess);
  const [language, setLang] = useState<Language>(props.language);
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [confirm, setConfirm] = useState("");
  const [delError, setDelError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();
  const browserTz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title={t("Profile")} />
        <div className="space-y-4 px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="email">{t("Email")}</Label>
              <Input id="email" value={props.email} disabled />
            </div>
            <div>
              <Label htmlFor="name">{t("First name")}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </div>
            <div>
              <Label htmlFor="tz">{t("Timezone")}</Label>
              <Input id="tz" value={tz} onChange={(e) => setTz(e.target.value)} maxLength={64} />
              {tz !== browserTz && (
                <button type="button" className="mt-1 text-xs text-primary hover:underline" onClick={() => setTz(browserTz)}>{t("Use this device's timezone ({0})", browserTz)}</button>
              )}
            </div>
            <div>
              <Label htmlFor="lang">{t("App language: menus, stories, questions and feedback")}</Label>
              <Select
                id="lang"
                value={language}
                disabled={switching}
                onChange={(e) => {
                  const l = e.target.value as Language;
                  setLang(l);
                  // Applies at once: the whole app switches to the new language.
                  startSwitch(async () => {
                    await setLanguage(l);
                    router.refresh();
                  });
                }}
              >
                {(Object.keys(LANGUAGE_LABELS) as Language[]).map((l) => (
                  <option key={l} value={l}>{t(LANGUAGE_LABELS[l])}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>{t("Programme start")}</Label>
              <Input value={props.startDate ? new Date(`${props.startDate}T00:00:00`).toLocaleDateString("en-GB", { dateStyle: "long" }) : "Not started"} disabled />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title={t("Privacy")} />
        <div className="px-5 py-5">
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={journal} onChange={(e) => setJournal(e.target.checked)} className="mt-1 size-4 accent-primary" />
            <span>
              <span className="block text-sm font-medium">{t("Let the AI Coach read my recent journal entries")}</span>
              <span className="block text-sm text-muted">{t("Off by default. When on, your five most recent entries are included when you message the coach, so its advice can reflect them. Entries are never used anywhere else.")}</span>
            </span>
          </label>
        </div>
        <div className="flex flex-col gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          {msg ? <Alert tone={msg.tone}>{msg.text}</Alert> : <span />}
          <Button
            disabled={saving}
            onClick={() =>
              startSave(async () => {
                const res = await updateSettings({ display_name: name, timezone: tz, coach_journal_access: journal, language });
                setMsg(res.error ? { tone: "danger", text: res.error } : { tone: "success", text: "Settings saved." });
              })
            }
          >
            {saving && <Spinner />}{" "}{t("Save changes")}</Button>
        </div>
      </Card>

      <Card>
        <CardHeader title={t("Your data")} description={t("Everything you have entered, and everything generated for you, belongs to you.")} />
        <div className="space-y-6 px-5 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">{t("Export all data")}</p>
              <p className="text-sm text-muted">{t("Download a JSON file with your assessment, check-ins, sessions, scores, journal and coach history.")}</p>
            </div>
            <a href="/api/export" className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-surface px-3.5 text-sm font-medium hover:bg-bg">
              <Download className="size-4" />{" "}{t("Export")}</a>
          </div>
          <div className="border-t border-line pt-6">
            <p className="text-sm font-medium text-danger">{t("Delete account")}</p>
            <p className="mt-1 text-sm text-muted">{t("Permanently deletes your account and all associated data. This cannot be undone. Type DELETE to confirm.")}</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={t("DELETE")} className="sm:w-48" aria-label={t("Type DELETE to confirm")} />
              <Button
                variant="danger"
                disabled={confirm !== "DELETE" || deleting}
                onClick={() =>
                  startDelete(async () => {
                    const res = await deleteAccount(confirm);
                    if (res?.error) setDelError(res.error);
                  })
                }
              >
                {deleting && <Spinner />}{" "}{t("Delete my account")}</Button>
            </div>
            {delError && <div className="mt-3"><Alert tone="danger">{t(delError)}</Alert></div>}
          </div>
        </div>
      </Card>
    </div>
  );
}
