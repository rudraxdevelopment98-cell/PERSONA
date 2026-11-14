"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { leaveCircleAction, removeMemberAction, renameCircleAction, reportAction, setRoleAction } from "@/app/(app)/friends/actions";
import { Alert, Button, Card, CardHeader, Input } from "@/components/ui";

export function MemberActions({ circleId, member, myRole }: { circleId: string; member: { id: string; name: string; role: string }; myRole: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (member.role === "owner" || (member.role === "admin" && myRole !== "owner")) return null;
  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else {
        setOpen(false);
        router.refresh();
      }
    });
  return (
    <div className="relative ml-auto">
      <button type="button" aria-label={`Manage ${member.name}`} onClick={() => setOpen((o) => !o)} className="rounded-lg p-1 text-muted hover:bg-bg">
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-52 rounded-xl border border-line bg-surface p-1.5 shadow-raised">
          {myRole === "owner" && (
            <button
              type="button"
              disabled={pending}
              className="w-full rounded-lg px-2.5 py-2 text-left text-sm hover:bg-bg"
              onClick={() => run(() => setRoleAction(circleId, member.id, member.role === "admin" ? "member" : "admin"))}
            >
              {member.role === "admin" ? "Remove admin" : "Make admin"}
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            className="w-full rounded-lg px-2.5 py-2 text-left text-sm text-danger hover:bg-danger-soft"
            onClick={() => confirm(`Remove ${member.name} from the circle?`) && run(() => removeMemberAction(circleId, member.id))}
          >
            Remove from circle
          </button>
          {error && <p className="px-2.5 text-xs text-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}

export function CircleAdmin({ circleId, name, emoji, myRole }: { circleId: string; name: string; emoji: string | null; myRole: string }) {
  const router = useRouter();
  const [newName, setNewName] = useState(name);
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const isAdmin = myRole === "owner" || myRole === "admin";
  return (
    <Card>
      <CardHeader title="Circle settings" />
      <div className="space-y-3 p-4 pt-2">
        {isAdmin && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const res = await renameCircleAction(circleId, { name: newName, emoji });
                setMsg(res.error ? { tone: "danger", text: res.error } : { tone: "success", text: "Renamed." });
                router.refresh();
              });
            }}
          >
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={60} aria-label="Circle name" />
            <Button variant="secondary" disabled={pending}>Rename</Button>
          </form>
        )}
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => {
              const warn = myRole === "owner" ? "Leave this circle? Ownership passes to the longest-standing admin or member. If you're the last member, the circle is deleted." : "Leave this circle?";
              if (confirm(warn))
                start(async () => {
                  const res = await leaveCircleAction(circleId);
                  if (res?.error) setMsg({ tone: "danger", text: res.error });
                });
            }}
          >
            Leave circle
          </Button>
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => {
              const details = prompt("What's wrong with this circle? (sent to the PERSONA 90 team)");
              if (details != null)
                start(async () => {
                  const res = await reportAction({ circleId, reason: "Circle report", details });
                  setMsg(res.error ? { tone: "danger", text: res.error } : { tone: "success", text: "Report sent. Thank you." });
                });
            }}
          >
            Report
          </Button>
        </div>
      </div>
    </Card>
  );
}
