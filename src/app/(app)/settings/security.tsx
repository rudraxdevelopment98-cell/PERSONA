"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { KeyRound, LogOut, RotateCcw, ShieldCheck } from "lucide-react";
import { RecoveryCodes } from "@/components/recovery-codes";
import { Alert, Button, Card, CardHeader, IconTile, Input, Label, Spinner } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { createRecoveryCodes, resetProgress } from "./security-actions";

type Msg = { tone: "success" | "danger"; text: string } | null;

export function SecuritySettings({ remaining, email }: { remaining: number; email: string }) {
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader icon={<IconTile tone="primary"><KeyRound className="size-5" /></IconTile>} title="Password & devices" />
        <div className="space-y-4 px-5 pb-5 pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="cur-pw">Current password</Label>
              <Input id="cur-pw" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="new-pw">New password</Label>
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
              {pending && <Spinner />} Change password
            </Button>
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
              <LogOut className="size-4" /> Sign out other devices
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          icon={<IconTile tone="accent"><ShieldCheck className="size-5" /></IconTile>}
          title="Recovery codes"
          description="Use one to reset your password if you forget it. No email needed."
        />
        <div className="space-y-4 px-5 pb-5 pt-3">
          {codes ? (
            <>
              <Alert tone="warning">Save these now - they won&apos;t be shown again. Your old codes no longer work.</Alert>
              <RecoveryCodes codes={codes} email={email} />
            </>
          ) : (
            <p className="text-sm">
              <span className="font-bold">{remaining}</span> unused code{remaining === 1 ? "" : "s"} left.
              {remaining <= 2 && <span className="text-warning"> Generate new ones soon.</span>}
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
            <RotateCcw className="size-4" /> Generate new codes
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader
          icon={<IconTile tone="coral"><RotateCcw className="size-5" /></IconTile>}
          title="Start the programme again"
          description="Deletes your assessment, sessions, scores, XP and badges, and starts again from Day 1. Your account stays."
        />
        <div className="space-y-3 px-5 pb-5 pt-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={keepJournal} onChange={(e) => setKeepJournal(e.target.checked)} className="size-4 accent-primary" />
            Keep my journal entries
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={resetText} onChange={(e) => setResetText(e.target.value)} placeholder="RESET" className="sm:w-48" aria-label="Type RESET to confirm" />
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
              {pending && <Spinner />} Reset my progress
            </Button>
          </div>
          {resetMsg && <Alert tone={resetMsg.tone}>{resetMsg.text}</Alert>}
        </div>
      </Card>
    </div>
  );
}
