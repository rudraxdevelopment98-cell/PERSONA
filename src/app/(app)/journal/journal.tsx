"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Alert, Badge, Button, Card, Input, Label, Select, Spinner } from "@/components/ui";
import type { JournalRow } from "@/lib/server/types";
import { deleteJournalEntry, saveJournalEntry } from "./actions";
import { VoiceTextarea } from "@/components/voice-input";
import { useT } from "@/lib/i18n/client";

const TYPES = [
  { id: "reflection", label: "Daily reflection" },
  { id: "observation", label: "Personal observation" },
  { id: "decision", label: "Important decision" },
  { id: "emotion", label: "Emotional pattern" },
  { id: "lesson", label: "Lesson learned" },
] as const;

const typeLabel = (it: string) => TYPES.find((x) => x.id === it)?.label ?? it;

const PROMPTS: Record<string, string> = {
  reflection: "What happened today that mattered? What did you notice about how you responded?",
  observation: "What did you notice about yourself or others? What might it tell you?",
  decision: "What did you decide, what were the options, and why did you choose this one?",
  emotion: "What did you feel, what triggered it, and how did it affect what you did?",
  lesson: "What did you learn, and what will you do differently next time?",
};

export function JournalEditor({ entry, onDone }: { entry?: JournalRow; onDone?: () => void }) {
  const t = useT();
  const [open, setOpen] = useState(Boolean(entry));
  const [title, setTitle] = useState(entry?.title ?? "");
  const [body, setBody] = useState(entry?.body ?? "");
  const [type, setType] = useState<JournalRow["entry_type"]>(entry?.entry_type ?? "reflection");
  const [mood, setMood] = useState<number | null>(entry?.mood ?? null);
  const [tags, setTags] = useState((entry?.tags ?? []).join(", "));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />{" "}{t("New entry")}</Button>
    );
  }

  function save() {
    setError(null);
    start(async () => {
      const res = await saveJournalEntry({
        id: entry?.id,
        title,
        body,
        entry_type: type,
        mood,
        tags: tags.split(",").map((it) => it.trim()).filter(Boolean),
      });
      if (res.error) return setError(res.error);
      if (!entry) {
        setTitle("");
        setBody("");
        setTags("");
        setMood(null);
        setOpen(false);
      }
      onDone?.();
    });
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
        <div>
          <Label htmlFor={`title-${entry?.id ?? "new"}`}>{t("Title")}</Label>
          <Input id={`title-${entry?.id ?? "new"}`} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </div>
        <div>
          <Label htmlFor={`type-${entry?.id ?? "new"}`}>{t("Type")}</Label>
          <Select id={`type-${entry?.id ?? "new"}`} value={type} onChange={(e) => setType(e.target.value as JournalRow["entry_type"])}>
            {TYPES.map((it) => (
              <option key={it.id} value={it.id}>{t(it.label)}</option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor={`body-${entry?.id ?? "new"}`}>{t("Entry")}</Label>
        <VoiceTextarea id={`body-${entry?.id ?? "new"}`} rows={7} maxLength={20000} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t(PROMPTS[type])} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={`mood-${entry?.id ?? "new"}`}>{t("Mood")}{" "}<span className="font-normal text-muted">{mood ? `${mood}/10` : t("(optional)")}</span>
          </Label>
          <input id={`mood-${entry?.id ?? "new"}`} type="range" min={1} max={10} value={mood ?? 5} onChange={(e) => setMood(Number(e.target.value))} className="w-full" />
        </div>
        <div>
          <Label htmlFor={`tags-${entry?.id ?? "new"}`}>{t("Tags")}{" "}<span className="font-normal text-muted">comma-separated</span></Label>
          <Input id={`tags-${entry?.id ?? "new"}`} value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t("work, family")} />
        </div>
      </div>
      {error && <Alert tone="danger">{t(error)}</Alert>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => (entry ? onDone?.() : setOpen(false))} disabled={pending}>{t("Cancel")}</Button>
        <Button onClick={save} disabled={pending || !title.trim() || !body.trim()}>
          {pending && <Spinner />}{" "}{t("Save entry")}</Button>
      </div>
    </Card>
  );
}

export function JournalFilters({ q, type }: { q: string; type: string }) {
  const t = useT();
  const router = useRouter();
  const path = usePathname();
  const [query, setQuery] = useState(q);
  const go = (nq: string, nt: string) => {
    const p = new URLSearchParams();
    if (nq) p.set("q", nq);
    if (nt) p.set("type", nt);
    router.push(`${path}${p.size ? `?${p}` : ""}`);
  };
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        go(query.trim(), type);
      }}
    >
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search your entries")} className="pl-9" aria-label={t("Search entries")} maxLength={200} />
      </div>
      <Select value={type} onChange={(e) => go(query.trim(), e.target.value)} className="sm:w-56" aria-label={t("Filter by type")}>
        <option value="">{t("All types")}</option>
        {TYPES.map((it) => (
          <option key={it.id} value={it.id}>{t(it.label)}</option>
        ))}
      </Select>
      <Button type="submit" variant="secondary">{t("Search")}</Button>
    </form>
  );
}

export function JournalEntryItem({ entry }: { entry: JournalRow }) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  if (editing) {
    return (
      <li className="p-4">
        <JournalEditor entry={entry} onDone={() => setEditing(false)} />
      </li>
    );
  }
  return (
    <li className="px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{t(entry.title)}</h3>
            <Badge>{typeLabel(entry.entry_type)}</Badge>
            {entry.mood && <span className="text-xs text-muted">{t("Mood {0}/10", entry.mood)}</span>}
          </div>
          <p className="mt-0.5 text-xs text-muted">{new Date(entry.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" className="h-8 px-2" onClick={() => setEditing(true)} aria-label={t("Edit entry")}>
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            className="h-8 px-2"
            aria-label={t("Delete entry")}
            disabled={pending}
            onClick={() => {
              if (confirm("Delete this entry permanently?")) start(async () => void (await deleteJournalEntry(entry.id)));
            }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{entry.body}</p>
      {entry.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {entry.tags.map((it) => (
            <span key={it} className="text-xs text-muted">#{t(it)}</span>
          ))}
        </div>
      )}
    </li>
  );
}
