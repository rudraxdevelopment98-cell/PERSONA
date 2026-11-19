"use client";

import { UpgradeHint } from "@/components/upgrade";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowUp, Trash2 } from "lucide-react";
import { Alert, Button, Card, Spinner, Textarea, cx } from "@/components/ui";
import { clearCoachHistory } from "./actions";

type Msg = { id: string; role: "user" | "assistant"; content: string };

const STARTERS = [
  "What pattern do you see in my recent check-ins?",
  "I froze in a meeting today. Help me understand why.",
  "How do I disagree with my manager without damaging the relationship?",
  "Which skill should I focus on this week, and how?",
];

function Bubble({ m }: { m: Msg }) {
  return (
    <div className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
      <div
        className={cx(
          "max-w-[85%] whitespace-pre-wrap rounded-lg px-4 py-2.5 text-sm leading-relaxed",
          m.role === "user" ? "bg-brand text-white" : "border border-line bg-surface text-ink",
        )}
      >
        {m.content || (
          <span className="flex items-center gap-1 py-1" aria-label="Coach is thinking">
            {[0, 1, 2].map((d) => (
              <span key={d} className="size-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${d * 0.15}s` }} />
            ))}
          </span>
        )}
      </div>
    </div>
  );
}

export function CoachChat({ initial }: { initial: Msg[] }) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState(false);
  const [clearing, startClear] = useTransition();
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming) return;
    setError(null);
    setUpgrade(false);
    setInput("");
    const assistantId = crypto.randomUUID();
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", content }, { id: assistantId, role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      const res = await fetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: content }) });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setUpgrade(Boolean(data.upgrade));
        throw new Error(data.error ?? "The coach is unavailable.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, content: x.content + chunk } : x)));
      }
    } catch (e) {
      setMessages((m) => m.filter((x) => x.id !== assistantId || x.content));
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setStreaming(false);
    }
  }

  return (
    <Card className="flex h-[calc(100vh-15rem)] min-h-[28rem] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
        {messages.length === 0 ? (
          <div className="mx-auto max-w-md py-10 text-center">
            <p className="text-sm font-medium">What would you like to work on?</p>
            <div className="mt-4 grid gap-2">
              {STARTERS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-md border border-line px-3 py-2 text-left text-sm text-muted hover:border-line-strong hover:text-ink">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => <Bubble key={m.id} m={m} />)
        )}
        <div ref={bottom} />
      </div>
      {error && (
        <div className="px-4 pb-2 sm:px-6">
          <Alert tone={upgrade ? "warning" : "danger"}>{error}</Alert>
          <UpgradeHint show={upgrade} />
        </div>
      )}
      <form
        className="flex items-end gap-2 border-t border-line p-3 sm:p-4"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          maxLength={4000}
          placeholder="Ask your coach…"
          className="min-h-9 resize-none"
          aria-label="Message"
        />
        <Button type="submit" disabled={streaming || !input.trim()} aria-label="Send">
          {streaming ? <Spinner /> : <ArrowUp className="size-4" />}
        </Button>
        {messages.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            aria-label="Clear conversation"
            title="Clear conversation"
            disabled={streaming || clearing}
            onClick={() => {
              if (!confirm("Delete this conversation? This cannot be undone.")) return;
              startClear(async () => {
                await clearCoachHistory();
                setMessages([]);
              });
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </form>
    </Card>
  );
}
