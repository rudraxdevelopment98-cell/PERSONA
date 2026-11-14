import { z } from "zod";
import { AIError, streamText } from "@/lib/ai/client";
import { COACH_SYSTEM } from "@/lib/ai/prompts";
import { buildAIContext } from "@/lib/server/context";
import { loadUserState } from "@/lib/server/state";
import { dbForUser, getSessionUser } from "@/lib/db/server";

export const maxDuration = 300;

const schema = z.object({ message: z.string().trim().min(1).max(4000) });

/** Streams the coach's reply and stores both sides of the conversation. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });
  const db = dbForUser(user.id);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Message must be 1-4000 characters." }, { status: 400 });

  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await db
    .from("coach_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("role", "user")
    .gte("created_at", since);
  if ((count ?? 0) >= 40) return Response.json({ error: "You've reached the hourly message limit." }, { status: 429 });

  const state = await loadUserState(db, user.id, user.email);
  const [{ data: history }, context] = await Promise.all([
    db.from("coach_messages").select("role, content").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    buildAIContext(db, state, { includeJournal: true, checkins: 5 }),
  ]);

  const saved = await db.from("coach_messages").insert({ user_id: user.id, role: "user", content: parsed.data.message });
  if (saved.error) return Response.json({ error: "Could not save your message." }, { status: 500 });

  const messages = [...(history ?? []).reverse(), { role: "user", content: parsed.data.message }] as { role: "user" | "assistant"; content: string }[];
  // The API requires the conversation to start with a user turn.
  while (messages.length > 0 && messages[0].role !== "user") messages.shift();

  const system = `${COACH_SYSTEM}\n\n# What you know about this user\n${context}`;
  const encoder = new TextEncoder();

  const body = new ReadableStream({
    async start(controller) {
      let reply = "";
      try {
        for await (const chunk of streamText({ system, messages, effort: "medium" })) {
          reply += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        const msg = err instanceof AIError ? err.message : "The coach is unavailable right now. Please try again.";
        controller.enqueue(encoder.encode(`${reply ? "\n\n" : ""}[${msg}]`));
      } finally {
        if (reply.trim()) await db.from("coach_messages").insert({ user_id: user.id, role: "assistant", content: reply.slice(0, 20000) });
        controller.close();
      }
    },
  });

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
