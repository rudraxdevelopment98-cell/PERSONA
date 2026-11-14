"use client";

import { useState, useTransition } from "react";
import { createCircleAction } from "@/app/(app)/friends/actions";
import { Alert, Button, Card, CardHeader, Input, Label } from "@/components/ui";

const EMOJI = ["👥", "🚀", "📚", "💼", "🔥", "🎯", "🌱", "🏆", "💡", "🧠"];

export function NewCircleForm() {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("👥");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card>
      <CardHeader title="Start a circle" description="You'll be the owner. You can own up to 5 circles." />
      <form
        className="space-y-3 p-5 pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          start(async () => {
            const res = await createCircleAction({ name, emoji });
            if (res?.error) setError(res.error);
          });
        }}
      >
        <div>
          <Label htmlFor="circle-name">Name</Label>
          <Input id="circle-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="e.g. MSc Cyber squad" required />
        </div>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Icon">
          {EMOJI.map((e) => (
            <button
              key={e}
              type="button"
              role="radio"
              aria-checked={emoji === e}
              onClick={() => setEmoji(e)}
              className={`flex size-10 items-center justify-center rounded-xl border text-xl ${emoji === e ? "border-primary bg-primary-soft" : "border-line"}`}
            >
              {e}
            </button>
          ))}
        </div>
        {error && <Alert tone="danger">{error}</Alert>}
        <Button disabled={pending || name.trim().length < 2}>{pending ? "Creating..." : "Create circle"}</Button>
      </form>
    </Card>
  );
}
