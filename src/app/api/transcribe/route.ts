import { getSessionUser } from "@/lib/db/server";
import { getPool } from "@/lib/db/pool";
import { AIError } from "@/lib/ai/client";
import { isLanguage } from "@/lib/domain/languages";
import { MAX_AUDIO_BYTES, TranscribeLimit, transcribe, transcriptionAvailable } from "@/lib/server/transcribe";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

const AUDIO_TYPES = /^audio\/(webm|ogg|mp4|mpeg|mp3|wav|x-wav|aac|m4a|x-m4a)(;.*)?$/;

/** Whether the server can transcribe (else the app uses the browser's speech recognition). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });
  return Response.json({ available: await transcriptionAvailable() });
}

/** Voice note → text, in the person's app language. The audio is not stored. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("audio");
  if (!(file instanceof Blob)) return Response.json({ error: "No audio received." }, { status: 400 });
  if (file.size > MAX_AUDIO_BYTES) return Response.json({ error: "Recording is too long. Try under 3 minutes." }, { status: 413 });
  const type = (file.type || "audio/webm").toLowerCase();
  if (!AUDIO_TYPES.test(type)) return Response.json({ error: "Unsupported audio format." }, { status: 415 });

  const asked = form?.get("lang");
  let lang = isLanguage(asked) ? asked : null;
  if (!lang) {
    const { rows } = await getPool().query<{ language: string }>("select language from public.profiles where id = $1", [user.id]);
    lang = isLanguage(rows[0]?.language) ? rows[0].language : "en";
  }
  try {
    const text = await transcribe(user.id, Buffer.from(await file.arrayBuffer()), type.split(";")[0], lang);
    return Response.json({ text });
  } catch (err) {
    if (err instanceof TranscribeLimit) return Response.json({ error: err.message }, { status: 429 });
    if (err instanceof AIError) return Response.json({ error: "Awaaz samajh nahi aayi. Dobara bolo ya type karo.", fallback: true }, { status: 503 });
    throw err;
  }
}
