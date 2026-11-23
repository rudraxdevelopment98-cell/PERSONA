"use client";
import { LANGUAGES } from "@/lib/domain/languages";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, Trash2 } from "lucide-react";
import { Alert, Badge, Button, Card, CardHeader, Input, Label, Select, Textarea } from "@/components/ui";
import { createCampaignAction, deleteCampaignAction, setCampaignActiveAction, setSponsorRequestAction } from "../actions";

const PLACES = [
  { id: "dashboard", label: "Home dashboard" },
  { id: "after_session", label: "After a finished session" },
  { id: "labs", label: "Decision & Communication Lab" },
];
const LANGS = LANGUAGES.map((l) => ({ id: l.id, label: l.label }));

export function CampaignForm() {
  const router = useRouter();
  const [f, setF] = useState({ sponsorName: "", category: "book", title: "", body: "", ctaLabel: "Learn more", url: "https://", days: 30, maxViews: "", weight: 1 });
  const [places, setPlaces] = useState<string[]>(["dashboard", "after_session", "labs"]);
  const [langs, setLangs] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const toggle = (list: string[], setList: (v: string[]) => void, id: string) => setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  return (
    <Card>
      <CardHeader title="New campaign" description="Preview how it looks on the right. Keep it honest and useful - it sits next to people's personal growth." />
      <form
        className="grid gap-4 px-5 pb-5 lg:grid-cols-[1fr_320px]"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await createCampaignAction({
              ...f,
              days: Number(f.days) || null,
              maxViews: f.maxViews ? Number(f.maxViews) : null,
              weight: Number(f.weight) || 1,
              placements: places,
              languages: langs.length ? langs : null,
            });
            if (r.error) setMsg({ tone: "danger", text: r.error });
            else {
              setMsg({ tone: "success", text: "Campaign is live." });
              setF((x) => ({ ...x, title: "", body: "", url: "https://" }));
              router.refresh();
            }
          });
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label htmlFor="sp-name">Sponsor</Label><Input id="sp-name" value={f.sponsorName} onChange={set("sponsorName")} maxLength={80} placeholder="Author, podcast or brand" /></div>
          <div>
            <Label htmlFor="sp-cat">Type</Label>
            <Select id="sp-cat" value={f.category} onChange={set("category")}>
              {["book", "podcast", "course", "app", "event", "other"].map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div className="sm:col-span-2"><Label htmlFor="sp-title">Title</Label><Input id="sp-title" value={f.title} onChange={set("title")} maxLength={80} /></div>
          <div className="sm:col-span-2"><Label htmlFor="sp-body">Text</Label><Textarea id="sp-body" value={f.body} onChange={set("body")} maxLength={220} className="min-h-16" /></div>
          <div><Label htmlFor="sp-cta">Button text</Label><Input id="sp-cta" value={f.ctaLabel} onChange={set("ctaLabel")} maxLength={30} /></div>
          <div><Label htmlFor="sp-url">Link</Label><Input id="sp-url" value={f.url} onChange={set("url")} maxLength={400} /></div>
          <div><Label htmlFor="sp-days">Runs for (days)</Label><Input id="sp-days" type="number" min={1} value={f.days} onChange={set("days")} /></div>
          <div><Label htmlFor="sp-max">Max views (empty = no limit)</Label><Input id="sp-max" type="number" min={1} value={f.maxViews} onChange={set("maxViews")} /></div>
          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 text-sm font-semibold">Show on</legend>
            <div className="flex flex-wrap gap-3 text-sm">
              {PLACES.map((p) => (
                <label key={p.id} className="flex items-center gap-1.5"><input type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={places.includes(p.id)} onChange={() => toggle(places, setPlaces, p.id)} />{p.label}</label>
              ))}
            </div>
          </fieldset>
          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 text-sm font-semibold">Language (none ticked = everyone)</legend>
            <div className="flex flex-wrap gap-3 text-sm">
              {LANGS.map((l) => (
                <label key={l.id} className="flex items-center gap-1.5"><input type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={langs.includes(l.id)} onChange={() => toggle(langs, setLangs, l.id)} />{l.label}</label>
              ))}
            </div>
          </fieldset>
          <div className="sm:col-span-2 flex items-center gap-3">
            <Button disabled={pending}>Publish campaign</Button>
            {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Preview</p>
          <div className="rounded-2xl border border-dashed border-line bg-surface p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Sponsored · {f.sponsorName || "Sponsor"}</p>
            <p className="mt-0.5 font-bold">{f.title || "Your title"}</p>
            <p className="text-sm text-muted">{f.body || "A short, helpful description."}</p>
            <p className="mt-2 text-sm font-semibold text-primary">{f.ctaLabel} ↗</p>
          </div>
        </div>
      </form>
    </Card>
  );
}

type Campaign = { id: string; sponsor_name: string; category: string; title: string; url: string; placements: string[]; languages: string[] | null; ends_at: string | null; max_views: number | null; active: boolean; views: number; clicks: number; views_30d: number; clicks_30d: number };

export function CampaignRow({ c }: { c: Campaign }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const ctr = c.views ? ((c.clicks / c.views) * 100).toFixed(1) : "0.0";
  const ended = c.ends_at && Date.parse(c.ends_at) < Date.now();
  const act = (fn: () => Promise<{ error?: string }>) => start(async () => { await fn(); router.refresh(); });
  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {c.title} <span className="font-normal text-muted">· {c.sponsor_name} · {c.category}</span>
        </p>
        <p className="truncate text-xs text-muted">{c.url}</p>
        <p className="text-xs text-muted">
          {c.placements.join(", ")} · {c.languages?.join(", ") ?? "all languages"}
          {c.ends_at ? ` · ${ended ? "ended" : "ends"} ${new Date(c.ends_at).toLocaleDateString()}` : ""}
          {c.max_views ? ` · cap ${c.max_views.toLocaleString()} views` : ""}
        </p>
      </div>
      <div className="text-right text-xs tabular-nums text-muted">
        <p><b className="text-ink">{c.views.toLocaleString()}</b> views · <b className="text-ink">{c.clicks.toLocaleString()}</b> clicks</p>
        <p>CTR {ctr}% · 30 days: {c.views_30d}/{c.clicks_30d}</p>
      </div>
      <Badge tone={c.active && !ended ? "success" : "neutral"}>{c.active ? (ended ? "ended" : "live") : "paused"}</Badge>
      <button type="button" aria-label={c.active ? "Pause" : "Resume"} disabled={pending} onClick={() => act(() => setCampaignActiveAction(c.id, !c.active))} className="rounded-lg p-1.5 text-muted hover:bg-bg">
        {c.active ? <Pause className="size-4" /> : <Play className="size-4" />}
      </button>
      {confirm ? (
        <button type="button" className="rounded-lg px-2 py-1 text-xs font-semibold text-danger hover:bg-danger-soft" disabled={pending} onClick={() => act(() => deleteCampaignAction(c.id))}>
          Confirm delete
        </button>
      ) : (
        <button type="button" aria-label="Delete" onClick={() => setConfirm(true)} className="rounded-lg p-1.5 text-muted hover:bg-bg hover:text-danger">
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  );
}

type Req = { id: string; name: string; email: string; category: string; link: string | null; budget: string | null; message: string | null; status: string; created_at: string };

export function RequestRow({ r }: { r: Req }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-start gap-3 px-5 py-3 text-sm">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {r.name} <span className="font-normal text-muted">· {r.category}{r.budget ? ` · budget ${r.budget}` : ""}</span>
        </p>
        <p className="text-xs text-muted">{r.email}{r.link ? ` · ${r.link}` : ""} · {new Date(r.created_at).toLocaleDateString()}</p>
        {r.message && <p className="mt-1 text-muted">{r.message}</p>}
      </div>
      <Select
        aria-label="Status"
        value={r.status}
        disabled={pending}
        className="w-36"
        onChange={(e) => start(async () => { await setSponsorRequestAction(r.id, e.target.value); router.refresh(); })}
      >
        <option value="new">New</option>
        <option value="contacted">Contacted</option>
        <option value="done">Done</option>
        <option value="declined">Declined</option>
      </Select>
    </div>
  );
}
