"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { Alert, Button, Input, Label, Spinner } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error"));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        if (password.length < 10) throw new Error("Use a password of at least 10 characters.");
        const { error } = await authClient.signUp.email({ email, password, name: name.trim().slice(0, 80) || "Member" });
        if (error) throw new Error(error.message || "Could not create your account.");
        router.replace("/welcome");
        return;
      } else {
        const { error } = await authClient.signIn.email({ email, password });
        if (error) throw new Error(error.status === 401 ? "Incorrect email or password." : error.message || "Could not sign in.");
        router.replace(safeNext(params.get("next")));
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
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
        <h1 className="text-xl font-semibold tracking-tight">{mode === "login" ? "Sign in" : "Create your account"}</h1>
        <p className="mt-1 text-sm text-muted">
          {mode === "login" ? "Continue your programme." : "Your data is private to you and can be exported or deleted at any time."}
        </p>

        <form onSubmit={submit} method="post" className="mt-6 space-y-4">
          {mode === "signup" && (
            <div>
              <Label htmlFor="name">First name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="given-name" />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <Label htmlFor="password">Password</Label>
              {mode === "login" && (
                <Link href="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
                  Forgot password?
                </Link>
              )}
            </div>
            <Input
              id="password"
              type="password"
              required
              minLength={mode === "signup" ? 10 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>
          {error && <Alert tone="danger">{error}</Alert>}
          <Button type="submit" disabled={busy} className="w-full">
            {busy && <Spinner />} {mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-sm text-muted">
          {mode === "login" ? (
            <>New here? <Link href="/signup" className="font-medium text-primary underline-offset-2 hover:underline">Create an account</Link></>
          ) : (
            <>Already registered? <Link href="/login" className="font-medium text-primary underline-offset-2 hover:underline">Sign in</Link></>
          )}
        </p>
      </div>
    </div>
  );
}
