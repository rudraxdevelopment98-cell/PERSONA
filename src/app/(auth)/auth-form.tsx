"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { Alert, Button, Input, Label, Spinner } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

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
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    try {
      if (mode === "signup") {
        if (password.length < 10) throw new Error("Use a password of at least 10 characters.");
        const origin = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name.trim().slice(0, 80) }, emailRedirectTo: `${origin}/auth/callback` },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice("Check your email to confirm your account, then sign in.");
          return;
        }
        router.replace("/assessment");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
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

        <form onSubmit={submit} className="mt-6 space-y-4">
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
            <Label htmlFor="password">Password</Label>
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
          {notice && <Alert tone="success">{notice}</Alert>}
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
