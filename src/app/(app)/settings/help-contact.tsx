"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { reportAction } from "../friends/actions";
import { Alert, Button, Card, CardHeader, Select } from "@/components/ui";
import { VoiceTextarea } from "@/components/voice-input";
import { useT } from "@/lib/i18n/client";

const TOPICS = ["Question", "Refund or payment", "Privacy or my data", "Grievance", "Bug", "Feedback"];

/** Help and contact: goes to the admins' Reports list. Also the grievance channel named in the Privacy Policy. */
export function HelpContact() {
  const t = useT();
  const [topic, setTopic] = useState(TOPICS[0]);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card id="help" className="mb-6 scroll-mt-20">
      <CardHeader title={t("Help and contact")} description={t("Questions, refunds, privacy requests or a grievance. We reply by email.")} />
      <form
        className="space-y-3 px-5 pb-5"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await reportAction({ reason: `Contact: ${topic}`, details: text });
            if (r.error !== undefined) setMsg({ tone: "danger", text: r.error });
            else {
              setMsg({ tone: "success", text: "Sent. We'll reply to your account email." });
              setText("");
            }
          });
        }}
      >
        <Select value={topic} onChange={(e) => setTopic(e.target.value)} aria-label={t("Topic")}>
          {TOPICS.map((it) => (
            <option key={it}>{t(it)}</option>
          ))}
        </Select>
        <VoiceTextarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={4} placeholder={t("How can we help?")} aria-label={t("Message")} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">
            <Link href="/terms" className="underline">{t("Terms")}</Link> · <Link href="/privacy" className="underline">{t("Privacy")}</Link> ·{" "}
            <Link href="/refund" className="underline">{t("Refunds")}</Link>
          </p>
          <Button disabled={pending || text.trim().length < 5}>{pending ? t("Sending…") : t("Send")}</Button>
        </div>
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      </form>
    </Card>
  );
}
