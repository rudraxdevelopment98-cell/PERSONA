import { NextResponse } from "next/server";
import { AIError } from "@/lib/ai/client";
import { getSessionUser } from "@/lib/db/server";
import { VoiceLimit, narratePart } from "@/lib/server/voice";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** GET ?session=<id>&part=<n>: AI narration (MP3) for one paragraph of the person's own story. */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const url = new URL(request.url);
  const session = url.searchParams.get("session") ?? "";
  const part = Number(url.searchParams.get("part"));
  if (!/^[0-9a-f-]{36}$/i.test(session) || !Number.isInteger(part)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    const audio = await narratePart(user.id, session, part);
    return new Response(new Uint8Array(audio), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=604800" } });
  } catch (err) {
    if (err instanceof VoiceLimit) return NextResponse.json({ error: err.message, limit: true }, { status: 402 });
    if (err instanceof AIError) return NextResponse.json({ error: err.message }, { status: 503 });
    console.error("voice error", err);
    return NextResponse.json({ error: "Could not create audio." }, { status: 500 });
  }
}
