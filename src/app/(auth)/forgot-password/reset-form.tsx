"use client";

import Link from "next/link";
import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Logo } from "@/components/logo";
import { Alert, Button, Input, Label, Spinner } from "@/components/ui";
import { postJSON } from "@/lib/client/api";

export function ResetForm() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    try {
      await postJSON("/api/recovery/reset", { email, code, password });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset the password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 inline-block">
          <Logo />
        </Link>
        <h1 className="text-xl font-extrabold tracking-tight">Forgot your password?</h1>
        {done ? (
          <div className="mt-4 space-y-4">
            <Alert tone="success">Your password has been changed and all devices were signed out. That recovery code can&apos;t be used again.</Alert>
            <Link href="/login" className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white">
              Sign in
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">Use one of the recovery codes you saved when you created your account.</p>
            <form onSubmit={submit} method="post" className="mt-6 space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </div>
              <div>
                <Label htmlFor="code">Recovery code</Label>
                <Input id="code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="XXXXX-XXXXX" autoComplete="one-time-code" className="font-mono uppercase" />
              </div>
              <div>
                <Label htmlFor="password">New password</Label>
                <Input id="password" type="password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
              </div>
              <div>
                <Label htmlFor="confirm">Confirm new password</Label>
                <Input id="confirm" type="password" required minLength={10} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
              </div>
              {error && <Alert tone="danger">{error}</Alert>}
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? <Spinner /> : <KeyRound className="size-4" />} Reset password
              </Button>
            </form>
            <p className="mt-6 text-sm text-muted">
              Lost your recovery codes too? Your data stays private and can&apos;t be recovered without them.{" "}
              <Link href="/login" className="font-semibold text-primary hover:underline">Back to sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
