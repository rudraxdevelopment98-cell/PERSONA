"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Ban, Check, KeyRound, Megaphone, Send, ShieldCheck, ShieldOff, Trash2, X } from "lucide-react";
import { Alert, Badge, Button, Card, CardHeader, Input, Label, Select, Textarea, cx } from "@/components/ui";
import type { ReportRow } from "@/lib/server/admin";
import { addAdminAction, broadcastAction, claimAdminAction, closeReportAction, deleteCircleAction, deleteUserAction, messageUserAction, setAdminAction, suspendAction } from "./actions";

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

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/plans", label: "Plans" },
  { href: "/admin/broadcast", label: "Announce" },
  { href: "/admin/log", label: "Admins & log" },
];

export function AdminTabs({ openReports }: { openReports: number }) {
  const path = usePathname();
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-line bg-surface p-1" aria-label="Admin">
      {TABS.map((t) => {
        const active = t.href === "/admin" ? path === "/admin" : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cx("inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold", active ? "bg-primary text-white" : "text-muted hover:bg-bg hover:text-ink")}
          >
            {t.label}
            {t.href === "/admin/reports" && openReports > 0 && <span className={cx("rounded-full px-1.5 text-[11px] font-bold", active ? "bg-white/20" : "bg-danger text-white")}>{openReports}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function UserActions({ user }: { user: { id: string; name: string; admin: boolean; suspended: boolean } }) {
  const router = useRouter();
  const { msg, pending, run } = useAction();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader title="Send a message" description="Arrives in their inbox and as a phone notification." />
        <form
          className="space-y-2 px-5 pb-5"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => messageUserAction(user.id, title, body), "Message sent.");
            setTitle("");
            setBody("");
          }}
        >
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Title" aria-label="Message title" />
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={300} placeholder="Message" aria-label="Message" className="min-h-20" />
          <Button disabled={pending || title.trim().length < 2 || body.trim().length < 2}>
            <Send className="size-4" /> Send
          </Button>
        </form>
      </Card>
      <Card>
        <CardHeader title="Account" />
        <div className="space-y-3 px-5 pb-5">
          <div className="flex flex-wrap gap-2">
            {user.suspended ? (
              <Button variant="secondary" disabled={pending} onClick={() => run(() => suspendAction(user.id, false), "Account restored.")}>Unsuspend</Button>
            ) : (
              <Button variant="danger" disabled={pending || user.admin} onClick={() => run(() => suspendAction(user.id, true), "Account suspended.")}>
                <Ban className="size-4" /> Suspend
              </Button>
            )}
            {user.admin ? (
              <Button variant="secondary" disabled={pending} onClick={() => run(() => setAdminAction(user.id, false), "Admin access removed.")}>
                <ShieldOff className="size-4" /> Remove admin
              </Button>
            ) : (
              <Button variant="secondary" disabled={pending || user.suspended} onClick={() => run(() => setAdminAction(user.id, true), "Now an admin.")}>
                <ShieldCheck className="size-4" /> Make admin
              </Button>
            )}
          </div>
          <div className="rounded-xl border border-danger/30 p-3">
            <p className="text-sm font-semibold text-danger">Delete account permanently</p>
            <p className="text-xs text-muted">Removes {user.name}&apos;s account and all their data. This can&apos;t be undone.</p>
            <div className="mt-2 flex gap-2">
              <Input value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} placeholder='Type "DELETE"' aria-label="Type DELETE to confirm" />
              <Button
                variant="danger"
                disabled={pending || confirmDelete !== "DELETE" || user.admin}
                onClick={() =>
                  run(async () => {
                    const res = await deleteUserAction(user.id, confirmDelete);
                    if (!res.error) router.replace("/admin/users");
                    return res;
                  })
                }
              >
                <Trash2 className="size-4" /> Delete
              </Button>
            </div>
          </div>
        </div>
      </Card>
      {msg && <div className="md:col-span-2"><Alert tone={msg.tone}>{msg.text}</Alert></div>}
    </div>
  );
}

export function BroadcastForm({ sizes }: { sizes: { all: number; active: number; inactive: number } }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/today");
  const [audience, setAudience] = useState<"all" | "active" | "inactive">("all");
  const [confirming, setConfirming] = useState(false);
  const { msg, pending, run } = useAction();
  const count = sizes[audience];
  return (
    <Card>
      <CardHeader title="New announcement" icon={<Megaphone className="mt-0.5 size-5 text-primary" />} />
      <form
        className="grid gap-3 px-5 pb-5 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!confirming) return setConfirming(true);
          run(async () => {
            const res = await broadcastAction({ title, body, url, audience });
            if (!res.error) {
              setTitle("");
              setBody("");
              setConfirming(false);
            }
            return res.error ? res : {};
          }, `Sent to ${count} people.`);
        }}
      >
        <div className="sm:col-span-2">
          <Label htmlFor="bc-title">Title</Label>
          <Input id="bc-title" value={title} onChange={(e) => { setTitle(e.target.value); setConfirming(false); }} maxLength={80} placeholder="e.g. New: story seasons are here 🎬" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="bc-body">Message</Label>
          <Textarea id="bc-body" value={body} onChange={(e) => { setBody(e.target.value); setConfirming(false); }} maxLength={300} className="min-h-20" />
        </div>
        <div>
          <Label htmlFor="bc-aud">Send to</Label>
          <Select id="bc-aud" value={audience} onChange={(e) => { setAudience(e.target.value as typeof audience); setConfirming(false); }}>
            <option value="all">Everyone ({sizes.all})</option>
            <option value="active">Active in the last 7 days ({sizes.active})</option>
            <option value="inactive">Not active for 7+ days ({sizes.inactive})</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="bc-url">Opens</Label>
          <Select id="bc-url" value={url} onChange={(e) => setUrl(e.target.value)}>
            <option value="/today">Today&apos;s session</option>
            <option value="/dashboard">Home</option>
            <option value="/friends">Friends</option>
            <option value="/inbox">Inbox</option>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button disabled={pending || title.trim().length < 2 || body.trim().length < 2} variant={confirming ? "danger" : "primary"}>
            <Send className="size-4" /> {confirming ? `Confirm: send to ${count} people` : "Send"}
          </Button>
          {confirming && <button type="button" className="text-sm text-muted underline" onClick={() => setConfirming(false)}>Cancel</button>}
        </div>
        {msg && <div className="sm:col-span-2"><Alert tone={msg.tone}>{msg.text}</Alert></div>}
      </form>
    </Card>
  );
}
