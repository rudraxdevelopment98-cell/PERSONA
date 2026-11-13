import { NotebookPen } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { getUserState } from "@/lib/server/state";
import type { JournalRow } from "@/lib/server/types";
import { JournalEditor, JournalEntryItem, JournalFilters } from "./journal";

export const metadata = { title: "Journal" };

const TYPES = ["reflection", "observation", "decision", "emotion", "lesson"] as const;

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const { db, user } = await getUserState();
  const { q = "", type = "" } = await searchParams;
  const query = q.trim().slice(0, 200);

  let req = db.from("journal_entries").select("id, title, body, entry_type, mood, tags, created_at, updated_at").eq("user_id", user.id);
  if (query) req = req.textSearch("search", query, { type: "websearch", config: "english" });
  if ((TYPES as readonly string[]).includes(type)) req = req.eq("entry_type", type);
  const { data } = await req.order("created_at", { ascending: false }).limit(100);
  const entries = (data ?? []) as JournalRow[];

  return (
    <>
      <PageHeader
        title="Personal Journal"
        description="A private space for reflections, observations, decisions, emotional patterns and lessons. Only you can read it - the AI Coach can see it only if you allow that in Settings."
      />
      <div className="space-y-6">
        <JournalEditor />
        <JournalFilters q={query} type={type} />
        {entries.length === 0 ? (
          <Card>
            <EmptyState
              icon={<NotebookPen className="size-6" strokeWidth={1.5} />}
              title={query || type ? "No matching entries" : "No entries yet"}
              description={query || type ? "Try a different search or filter." : "Write your first entry above. Short, honest notes are more useful than long, polished ones."}
            />
          </Card>
        ) : (
          <Card>
            <ul className="divide-y divide-line">
              {entries.map((e) => (
                <JournalEntryItem key={e.id} entry={e} />
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
