"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { HelpCircle, KeyRound, LogOut, RotateCcw, ShieldCheck } from "lucide-react";
import { RecoveryCodes } from "@/components/recovery-codes";
import { Alert, Button, Card, CardHeader, IconTile, Input, Label, Spinner } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { createRecoveryCodes, resetProgress, saveMyQuestions } from "./security-actions";
import { useT } from "@/lib/i18n/client";

type Msg = { tone: "success" | "danger"; text: string } | null;

export function SecuritySettings({ remaining, email, questions }: { remaining: number; email: string; questions: { q1: string; q2: string } | null }) {
  const t = useT();
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pwMsg, setPwMsg] = useState<Msg>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [codesMsg, setCodesMsg] = useState<Msg>(null);
  const [resetText, setResetText] = useState("");
  const [keepJournal, setKeepJournal] = useState(true);
  const [resetMsg, setResetMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  const [q1, setQ1] = useState(questions?.q1 ?? "");
  const [a1, setA1] = useState("");
  const [q2, setQ2] = useState(questions?.q2 ?? "");
  const [a2, setA2] = useState("");
  const [qMsg, setQMsg] = useState<Msg>(null);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader icon={<IconTile tone="primary"><KeyRound className="size-5" /></IconTile>} title={t("Password & devices")} />
        <div className="space-y-4 px-5 pb-5 pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="cur-pw">{t("Current password")}</Label>
              <Input id="cur-pw" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="new-pw">{t("New password")}</Label>
              <Input id="new-pw" type="password" autoComplete="new-password" minLength={10} value={next} onChange={(e) => setNext(e.target.value)} />
            </div>
          </div>
          {pwMsg && <Alert tone={pwMsg.tone}>{pwMsg.text}</Alert>}
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={pending || !current || next.length < 10}
              onClick={() =>
                start(async () => {
                  const { error } = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
                  if (error) setPwMsg({ tone: "danger", text: error.status === 400 || error.status === 401 ? "Your current password is incorrect." : error.message || "Could not change the password." });
                  else {
                    setCurrent("");
                    setNext("");
                    setPwMsg({ tone: "success", text: "Password changed. Other devices were signed out." });
                  }
                })
              }
            >
              {pending && <Spinner />}{" "}{t("Change password")}</Button>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const { error } = await authClient.revokeOtherSessions();
                  setPwMsg(error ? { tone: "danger", text: "Could not sign out other devices." } : { tone: "success", text: "Signed out on all other devices." });
                })
              }
            >
              <LogOut className="size-4" />{" "}{t("Sign out other devices")}</Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          icon={<IconTile tone="accent"><ShieldCheck className="size-5" /></IconTile>}
          title={t("Recovery codes")}
          description={t("Use one to reset your password if you forget it. No email needed.")}
        />
        <div className="space-y-4 px-5 pb-5 pt-3">
          {codes ? (
            <>
              <Alert tone="warning">{t("Save these now - they won't be shown again. Your old codes no longer work.")}</Alert>
              <RecoveryCodes codes={codes} email={email} />
            </>
          ) : (
            <p className="text-sm">
              <span className="font-bold">{remaining}</span>{" "}{t("unused code")}{remaining === 1 ? "" : "s"}{" "}{t("left.")}{remaining <= 2 && <span className="text-warning">{" "}{t("Generate new ones soon.")}</span>}
            </p>
          )}
          {codesMsg && <Alert tone={codesMsg.tone}>{codesMsg.text}</Alert>}
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => {
              if (remaining > 0 && !confirm("Generate new codes? Your current codes will stop working.")) return;
              start(async () => {
                const r = await createRecoveryCodes();
                if (r.codes) setCodes(r.codes);
                else setCodesMsg({ tone: "danger", text: r.error ?? "Could not create codes." });
              });
            }}
          >
            <RotateCcw className="size-4" />{" "}{t("Generate new codes")}</Button>
        </div>
      </Card>

      <Card>
        <CardHeader
          icon={<IconTile tone="sky"><HelpCircle className="size-5" /></IconTile>}
          title={t("Backup security questions")}
          description={t("If you lose your recovery codes too, answer these to reset your password. Write questions only you can answer - avoid things on your social media.")}
        />
        <div className="space-y-3 px-5 pb-5 pt-3">
          {questions && <p className="text-sm text-success">{t("✓ Set. Enter new answers below to change them.")}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="sq1">{t("Question 1")}</Label>
              <Input id="sq1" value={q1} onChange={(e) => setQ1(e.target.value)} maxLength={200} placeholder={t("e.g. What did I name my first bicycle?")} />
            </div>
            <div>
              <Label htmlFor="sa1">{t("Answer 1")}</Label>
              <Input id="sa1" type="password" autoComplete="off" value={a1} onChange={(e) => setA1(e.target.value)} maxLength={200} />
            </div>
            <div>
              <Label htmlFor="sq2">{t("Question 2")}</Label>
              <Input id="sq2" value={q2} onChange={(e) => setQ2(e.target.value)} maxLength={200} placeholder={t("e.g. Which teacher do I remember most, and why?")} />
            </div>
            <div>
              <Label htmlFor="sa2">{t("Answer 2")}</Label>
              <Input id="sa2" type="password" autoComplete="off" value={a2} onChange={(e) => setA2(e.target.value)} maxLength={200} />
            </div>
          </div>
          <p className="text-xs text-muted">{t("Answers ignore capital letters and punctuation, and are stored only as a secure hash.")}</p>
          {qMsg && <Alert tone={qMsg.tone}>{qMsg.text}</Alert>}
          <Button
            variant="secondary"
            disabled={pending || !q1 || !q2 || !a1 || !a2}
            onClick={() =>
              start(async () => {
                const r = await saveMyQuestions({ q1, a1, q2, a2 });
                if (r.error) setQMsg({ tone: "danger", text: r.error });
                else {
                  setA1("");
                  setA2("");
                  setQMsg({ tone: "success", text: "Security questions saved." });
                }
              })
            }
          >
            {pending && <Spinner />}{" "}{t("Save questions")}</Button>
        </div>
      </Card>

      <Card>
        <CardHeader
          icon={<IconTile tone="coral"><RotateCcw className="size-5" /></IconTile>}
          title={t("Start the programme again")}
          description={t("Deletes your assessment, sessions, scores, XP and badges, and starts again from Day 1. Your account stays.")}
        />
        <div className="space-y-3 px-5 pb-5 pt-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={keepJournal} onChange={(e) => setKeepJournal(e.target.checked)} className="size-4 accent-primary" />{t("Keep my journal entries")}</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={resetText} onChange={(e) => setResetText(e.target.value)} placeholder={t("RESET")} className="sm:w-48" aria-label={t("Type RESET to confirm")} />
            <Button
              variant="danger"
              disabled={pending || resetText !== "RESET"}
              onClick={() =>
                start(async () => {
                  const r = await resetProgress(resetText, keepJournal);
                  if (r.error) setResetMsg({ tone: "danger", text: r.error });
                  else router.push("/assessment");
                })
              }
            >
              {pending && <Spinner />}{" "}{t("Reset my progress")}</Button>
          </div>
          {resetMsg && <Alert tone={resetMsg.tone}>{resetMsg.text}</Alert>}
        </div>
      </Card>
    </div>
  );
}
