"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Input, Label, Select, Spinner } from "@/components/ui";
import { LANGUAGE_LABELS, type Language } from "@/lib/ai/prompts";
import { setLanguage, updateSettings } from "./actions";
import { useT } from "@/lib/i18n/client";

/** Name, email, timezone, language and programme start. */
export function AccountForm(props: {
  email: string;
  displayName: string;
  timezone: string;
  coachJournalAccess: boolean;
  startDate: string | null;
  language: Language;
}) {
  const t = useT();
  const router = useRouter();
  const [name, setName] = useState(props.displayName);
  const [tz, setTz] = useState(props.timezone);
  const [language, setLang] = useState<Language>(props.language);
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [switching, startSwitch] = useTransition();
  const [saving, startSave] = useTransition();
  const browserTz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">{t("First name")}</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
      </div>
      <div>
        <Label htmlFor="email">{t("Email")}</Label>
        <Input id="email" value={props.email} disabled />
      </div>
      <div>
        <Label htmlFor="lang">{t("App language")}</Label>
        <Select
          id="lang"
          value={language}
          disabled={switching}
          onChange={(e) => {
            const l = e.target.value as Language;
            setLang(l);
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
        <p className="mt-1 text-xs text-muted">{t("Menus, stories, questions and feedback.")}</p>
      </div>
      <div>
        <Label htmlFor="tz">{t("Timezone")}</Label>
        <Input id="tz" value={tz} onChange={(e) => setTz(e.target.value)} maxLength={64} />
        {tz !== browserTz && (
          <button type="button" className="mt-1 text-xs text-primary hover:underline" onClick={() => setTz(browserTz)}>{t("Use this device's timezone ({0})", browserTz)}</button>
        )}
      </div>
      <div>
        <Label>{t("Programme start")}</Label>
        <Input value={props.startDate ? new Date(`${props.startDate}T00:00:00`).toLocaleDateString("en-GB", { dateStyle: "long" }) : "Not started"} disabled />
      </div>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <Button
        disabled={saving}
        onClick={() =>
          startSave(async () => {
            const res = await updateSettings({ display_name: name, timezone: tz, coach_journal_access: props.coachJournalAccess, language });
            setMsg(res.error ? { tone: "danger", text: res.error } : { tone: "success", text: t("Saved.") });
          })
        }
      >
        {saving && <Spinner />} {t("Save changes")}
      </Button>
    </div>
  );
}
