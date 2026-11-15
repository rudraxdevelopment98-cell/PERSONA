"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, KeyRound, Trash2, X } from "lucide-react";
import { Alert, Badge, Button, Card, Input, Textarea } from "@/components/ui";
import type { ReportRow } from "@/lib/server/admin";
import { addAdminAction, claimAdminAction, closeReportAction, deleteCircleAction, suspendAction } from "./actions";

function useAction() {
  const router = useRouter();
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ error?: string }>, ok?: string) =>
    start(async () => {
      const res = await fn();
      if (res.error) setMsg({ tone: "danger", text: res.error });
      else {
        setMsg(ok ? { tone: "success", text: ok } : null);
        router.refresh();
      }
    });
  return { msg, pending, run };
}

export function ClaimAdmin() {
  const [code, setCode] = useState("");
  const { msg, pending, run } = useAction();
  return (
    <Card className="max-w-md space-y-3 p-5">
      <label htmlFor="admin-code" className="text-sm font-semibold">Setup code</label>
      <Input id="admin-code" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" />
      <Button disabled={pending || code.trim().length < 8} onClick={() => run(() => claimAdminAction(code))}>
        <KeyRound className="size-4" /> Become admin
      </Button>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
    </Card>
  );
}

export function AddAdmin() {
  const [email, setEmail] = useState("");
  const { msg, pending, run } = useAction();
  return (
    <form
      className="flex max-w-md flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => addAdminAction(email), "Admin added.");
      }}
    >
      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="their account email" aria-label="Email" />
      <Button variant="secondary" disabled={pending}>Add admin</Button>
      {msg && <div className="sm:basis-full"><Alert tone={msg.tone}>{msg.text}</Alert></div>}
    </form>
  );
}

export function ReportCard({ report: r }: { report: ReportRow }) {
  const [note, setNote] = useState("");
  const { msg, pending, run } = useAction();
  const open = r.status === "open";
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold">{r.reason}</p>
          <p className="text-xs text-muted">
            {new Date(r.created_at).toLocaleString()} · reported by {r.reporter_name}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {r.target_suspended && <Badge tone="danger">Suspended</Badge>}
          {r.prior_reports > 0 && <Badge tone="warning">{r.prior_reports} other report{r.prior_reports === 1 ? "" : "s"}</Badge>}
          {!open && <Badge tone={r.status === "resolved" ? "success" : "neutral"}>{r.status}</Badge>}
        </div>
      </div>
      <div className="mt-3 space-y-1 text-sm">
        {r.target_id && (
          <p>
            <span className="text-muted">Person:</span> <b>{r.target_name}</b> {r.target_email && <span className="text-muted">({r.target_email})</span>}
          </p>
        )}
        {r.circle_id && (
          <p>
            <span className="text-muted">Circle:</span> <b>{r.circle_name ?? "(deleted)"}</b>
          </p>
        )}
        {r.details && <p className="rounded-xl bg-bg px-3 py-2 text-ink">{r.details}</p>}
        {!open && r.resolution && <p className="text-xs text-muted">Note: {r.resolution}</p>}
      </div>

      <div className="mt-3 space-y-2 border-t border-line pt-3">
        {open && <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Note (optional) - what you did and why" className="min-h-14" />}
        <div className="flex flex-wrap gap-2">
          {open && (
            <>
              <Button disabled={pending} onClick={() => run(() => closeReportAction(r.id, "resolved", note), "Report resolved.")}>
                <Check className="size-4" /> Resolve
              </Button>
              <Button variant="secondary" disabled={pending} onClick={() => run(() => closeReportAction(r.id, "dismissed", note), "Report dismissed.")}>
                <X className="size-4" /> Dismiss
              </Button>
            </>
          )}
          {r.target_id &&
            (r.target_suspended ? (
              <Button variant="ghost" disabled={pending} onClick={() => run(() => suspendAction(r.target_id!, false), "Account restored.")}>
                Unsuspend {r.target_name}
              </Button>
            ) : (
              <Button
                variant="danger"
                disabled={pending}
                onClick={() => confirm(`Suspend ${r.target_name}? They are signed out everywhere and can't sign in until you unsuspend them.`) && run(() => suspendAction(r.target_id!, true), "Account suspended.")}
              >
                <Ban className="size-4" /> Suspend account
              </Button>
            ))}
          {r.circle_id && r.circle_name && (
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => confirm(`Delete the circle "${r.circle_name}" for everyone?`) && run(() => deleteCircleAction(r.circle_id!), "Circle deleted.")}
            >
              <Trash2 className="size-4" /> Delete circle
            </Button>
          )}
        </div>
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      </div>
    </Card>
  );
}
