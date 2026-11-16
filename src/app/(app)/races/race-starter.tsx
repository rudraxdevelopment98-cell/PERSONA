"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { createRaceAction } from "@/app/(app)/friends/actions";
import { Alert, Button, Card, CardHeader, Input, Label, Select } from "@/components/ui";
import { RACE_KINDS } from "@/lib/domain/social";
import { UpgradeHint } from "@/components/upgrade";

export function RaceStarter({ friendId = null, circleId = null, name }: { friendId?: string | null; circleId?: string | null; name: string }) {
  const [kind, setKind] = useState<string>("sessions");
  const [days, setDays] = useState(7);
  const [teams, setTeams] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState(false);
  const [pending, start] = useTransition();
  const k = RACE_KINDS.find((x) => x.id === kind)!;

  return (
    <Card>
      <CardHeader title="Start a race" description={circleId ? `Challenge everyone in ${name}.` : `Challenge ${name} to a friendly race.`} icon={<Flag className="mt-0.5 size-5 text-warning" />} />
      <form
        className="grid gap-3 p-5 pt-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          start(async () => {
            const res = await createRaceAction({ friendId, circleId, kind, days, teams, title: title || undefined });
            if (res?.error) {
              setError(res.error);
              setUpgrade(Boolean(res.upgrade));
            }
          });
        }}
      >
        <div>
          <Label htmlFor="race-kind">Race type</Label>
          <Select id="race-kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            {RACE_KINDS.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-muted">{k.description}</p>
        </div>
        <div>
          <Label htmlFor="race-days">Length</Label>
          <Select id="race-days" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {[3, 7, 14, 21, 30].map((d) => (
              <option key={d} value={d}>{d} days</option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="race-title">Name (optional)</Label>
          <Input id="race-title" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder={`${days}-day ${k.label.toLowerCase()}`} />
        </div>
        {circleId && (
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={teams} onChange={(e) => setTeams(e.target.checked)} className="size-4 accent-[var(--color-primary)]" />
            Team race - split joiners into two balanced teams
          </label>
        )}
        {error && (
          <div className="sm:col-span-2">
            <Alert tone={upgrade ? "warning" : "danger"}>{error}</Alert>
            <UpgradeHint show={upgrade} />
          </div>
        )}
        <div className="sm:col-span-2">
          <Button disabled={pending}>{pending ? "Starting..." : "Start race"}</Button>
          <p className="mt-2 text-xs text-muted">Everyone starts at zero. Only counts are shared.</p>
        </div>
      </form>
    </Card>
  );
}
