"use client";

import { useState, useTransition } from "react";
import { Alert, Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import { requestPromotion } from "./actions";

export function AdvertiseForm() {
  const [f, setF] = useState({ name: "", email: "", category: "book", link: "", budget: "", message: "", website: "" });
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  if (msg?.tone === "success")
    return (
      <Card className="h-fit p-6">
        <p className="text-2xl">🙌</p>
        <p className="mt-2 font-bold">Thanks - we&apos;ve got your request.</p>
        <p className="text-sm text-muted">We&apos;ll reply to {f.email} soon.</p>
      </Card>
    );
  return (
    <Card className="h-fit p-5">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await requestPromotion(f);
            setMsg(r.error ? { tone: "danger", text: r.error } : { tone: "success", text: "sent" });
          });
        }}
      >
        <div><Label htmlFor="ad-name">Your name</Label><Input id="ad-name" value={f.name} onChange={set("name")} maxLength={80} required /></div>
        <div><Label htmlFor="ad-email">Email</Label><Input id="ad-email" type="email" value={f.email} onChange={set("email")} maxLength={200} required /></div>
        <div>
          <Label htmlFor="ad-cat">What do you want to promote?</Label>
          <Select id="ad-cat" value={f.category} onChange={set("category")}>
            <option value="book">Book</option>
            <option value="podcast">Podcast</option>
            <option value="course">Course</option>
            <option value="app">App</option>
            <option value="event">Event</option>
            <option value="other">Something else</option>
          </Select>
        </div>
        <div><Label htmlFor="ad-link">Link</Label><Input id="ad-link" value={f.link} onChange={set("link")} maxLength={400} placeholder="https://" /></div>
        <div><Label htmlFor="ad-budget">Budget (optional)</Label><Input id="ad-budget" value={f.budget} onChange={set("budget")} maxLength={60} placeholder="e.g. $100 / month" /></div>
        <div><Label htmlFor="ad-msg">Tell us about it</Label><Textarea id="ad-msg" value={f.message} onChange={set("message")} maxLength={1500} className="min-h-24" /></div>
        <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={f.website} onChange={set("website")} name="website" />
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <Button className="w-full" disabled={pending}>{pending ? "Sending…" : "Send request"}</Button>
      </form>
    </Card>
  );
}
