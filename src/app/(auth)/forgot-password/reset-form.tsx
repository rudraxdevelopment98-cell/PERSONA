"use client";

import Link from "next/link";
import { useState } from "react";
import { HelpCircle, KeyRound } from "lucide-react";
import { Logo } from "@/components/logo";
import { Alert, Button, Input, Label, Spinner, cx } from "@/components/ui";
import { postJSON } from "@/lib/client/api";
import { useT } from "@/lib/i18n/client";

type Method = "code" | "questions";

export function ResetForm() {
  const t = useT();
  const [method, setMethod] = useState<Method>("code");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [questions, setQuestions] = useState<{ q1: string; q2: string } | null>(null);
  const [a1, setA1] = useState("");
  const [a2, setA2] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function loadQuestions() {
    setError(null);
    setBusy(true);
    try {
      setQuestions(await postJSON<{ q1: string; q2: string }>("/api/recovery/questions", { email }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the questions.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (method === "questions" && !questions) return loadQuestions();
    if (password !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    try {
      await postJSON(
        "/api/recovery/reset",
        method === "code" ? { method, email, code, password } : { method, email, answer1: a1, answer2: a2, password },
      );
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset the password.");
    } finally {
      setBusy(false);
    }
  }

  const showPasswords = method === "code" || questions;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 inline-block">
          <Logo />
        </Link>
        <h1 className="text-xl font-extrabold tracking-tight">{t("Forgot your password?")}</h1>
        {done ? (
          <div className="mt-4 space-y-4">
            <Alert tone="success">{t("Your password has been changed and all devices were signed out.")}</Alert>
            <Link href="/login" className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white">{t("Sign in")}</Link>
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 rounded-full bg-primary-soft p-1">
              {(["code", "questions"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMethod(m);
                    setError(null);
                  }}
                  aria-pressed={method === m}
                  className={cx("inline-flex items-center justify-center gap-1.5 rounded-full py-1.5 text-sm font-semibold", method === m ? "bg-surface text-primary shadow-card" : "text-muted")}
                >
                  {m === "code" ? <KeyRound className="size-4" /> : <HelpCircle className="size-4" />}
                  {m === "code" ? t("Recovery code") : t("Security questions")}
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted">
              {method === "code" ? t("Use one of the recovery codes you saved when you created your account.") : t("Answer the two questions you set in Settings.")}
            </p>
            <form onSubmit={submit} method="post" className="mt-5 space-y-4">
              <div>
                <Label htmlFor="email">{t("Email")}</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setQuestions(null);
                  }}
                  autoComplete="email"
                />
              </div>
              {method === "code" && (
                <div>
                  <Label htmlFor="code">{t("Recovery code")}</Label>
                  <Input id="code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder={t("XXXXX-XXXXX")} autoComplete="one-time-code" className="font-mono uppercase" />
                </div>
              )}
              {method === "questions" && questions && (
                <>
                  <div>
                    <Label htmlFor="a1">{t(questions.q1)}</Label>
                    <Input id="a1" required value={a1} onChange={(e) => setA1(e.target.value)} autoComplete="off" />
                  </div>
                  <div>
                    <Label htmlFor="a2">{t(questions.q2)}</Label>
                    <Input id="a2" required value={a2} onChange={(e) => setA2(e.target.value)} autoComplete="off" />
                  </div>
                </>
              )}
              {showPasswords && (
                <>
                  <div>
                    <Label htmlFor="password">{t("New password")}</Label>
                    <Input id="password" type="password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
                  </div>
                  <div>
                    <Label htmlFor="confirm">{t("Confirm new password")}</Label>
                    <Input id="confirm" type="password" required minLength={10} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
                  </div>
                </>
              )}
              {error && <Alert tone="danger">{t(error)}</Alert>}
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? <Spinner /> : <KeyRound className="size-4" />} {method === "questions" && !questions ? t("Show my questions") : t("Reset password")}
              </Button>
            </form>
            <p className="mt-6 text-sm text-muted">{t("Lost both? For your privacy there is no other way in - your data is protected by your password.")}{" "}
              <Link href="/login" className="font-semibold text-primary hover:underline">{t("Back to sign in")}</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
