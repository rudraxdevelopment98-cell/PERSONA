import "server-only";
import { z } from "zod";
import { getPool } from "@/lib/db/pool";
import { AIError, appProvider, gatewayToken, gatewayUrl, generateStructured, runWithAIContext } from "@/lib/ai/client";
import { languageInfo, type Language } from "@/lib/domain/languages";
import { getPlan } from "./plan";

/**
 * Speech to text for every answer box. The audio is sent to the AI provider,
 * turned into text and thrown away: it is never stored by the app.
 *
 * 1. Vercel AI Gateway transcription model (default openai/gpt-transcribe; no key on Vercel).
 * 2. Gemini with the audio inline (GEMINI_API_KEY).
 * Hinglish answers come back in Roman script, like the person types.
 */

const q = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await getPool().query(sql, params)).rows as T[];

export const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
export const DAILY_LIMIT = { free: 30, pro: 150 } as const;
const COST_PER_MIN = 0.006;

export class TranscribeLimit extends Error {}

type Config = { model: string };
async function config(): Promise<Config> {
  const [r] = await q<{ value: Partial<Config> }>("select value from public.app_settings where key = 'voice_input'").catch(() => []);
  return { model: r?.value?.model || process.env.AI_TRANSCRIBE_MODEL || "openai/gpt-transcribe" };
}

/** Whether a server model can transcribe (else the browser's own speech recognition is used). */
export async function transcriptionAvailable(): Promise<boolean> {
  if (process.env.AI_SPEECH_URL || process.env.GEMINI_API_KEY || process.env.AI_GATEWAY_API_KEY) return true;
  try {
    await gatewayToken();
    return true;
  } catch {
    return false;
  }
}

const HINTS: Partial<Record<Language, string>> = {
  hinglish: "Hindi and English mixed (Hinglish), as spoken by young Indians.",
  hi: "Hindi.",
  en: "English, Indian accent.",
};

async function viaGateway(audio: Buffer, mediaType: string, lang: Language, model: string): Promise<{ text: string; seconds: number }> {
  const code = lang === "hinglish" ? "hi" : lang;
  const body: Record<string, unknown> = {
    audio: audio.toString("base64"),
    mediaType,
    providerOptions: { openai: { language: code, prompt: HINTS[lang] ?? `${languageInfo(lang).english}.` } },
  };
  const call = async (b: Record<string, unknown>) =>
    fetch(`${process.env.AI_SPEECH_URL || gatewayUrl()}/v4/ai/transcription-model`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await gatewayToken()}`,
        "ai-gateway-protocol-version": "0.0.1",
        "ai-transcription-model-specification-version": "4",
        "ai-model-id": model,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(b),
      signal: AbortSignal.timeout(60_000),
    });
  let res = await call(body);
  // Provider options differ per model: retry once without them.
  if (res.status === 400) {
    delete body.providerOptions;
    res = await call(body);
  }
  if (!res.ok) throw new AIError(`Transcription failed (${res.status}).`, "upstream");
  const j = (await res.json().catch(() => null)) as { text?: string; durationInSeconds?: number } | null;
  if (typeof j?.text !== "string") throw new AIError("Transcription returned no text.", "upstream");
  return { text: j.text, seconds: j.durationInSeconds ?? 0 };
}

async function viaGemini(audio: Buffer, mediaType: string, lang: Language): Promise<{ text: string; seconds: number }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AIError("No transcription service is configured.", "not_configured");
  const p = appProvider();
  const model = p.kind === "gemini" ? p.model : "gemini-3.6-flash";
  const l = languageInfo(lang);
  const script = lang === "hinglish" ? "Roman (Latin) script Hinglish, the way people text" : lang === "en" ? "English" : `${l.english} in ${l.script} script`;
  const res = await fetch(`${process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com"}/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: mediaType, data: audio.toString("base64") } },
            { text: `Transcribe this voice note word for word. Write it in ${script}. Add punctuation. Do not translate, summarise, answer or add anything. If there is no speech, return an empty string. Output only the transcript.` },
          ],
        },
      ],
      generationConfig: { temperature: 0 },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new AIError(`Transcription failed (${res.status}).`, "upstream");
  const j = (await res.json().catch(() => null)) as { candidates?: { content?: { parts?: { text?: string }[] } }[] } | null;
  const text = j?.candidates?.[0]?.content?.parts?.map((x) => x.text ?? "").join("") ?? "";
  return { text: text.trim(), seconds: 0 };
}

/** Hinglish users type in Roman script; rewrite Devanagari transcripts the same way. */
async function romanise(userId: string, text: string): Promise<string> {
  if (!/[ऀ-ॿ]/.test(text)) return text;
  try {
    const out = await runWithAIContext({ userId, feature: "voice.romanise", tier: "free" }, () =>
      generateStructured({
        system: "You convert Hindi written in Devanagari into Roman-script Hinglish exactly as spoken (transliterate, do not translate or change words). Keep English words as English.",
        prompt: text,
        schema: z.object({ text: z.string() }),
        effort: "low",
        maxTokens: 1500,
        language: "hinglish",
      }),
    );
    return out.text || text;
  } catch {
    return text;
  }
}

export async function transcribe(userId: string, audio: Buffer, mediaType: string, lang: Language): Promise<string> {
  if (audio.length < 800) return "";
  if (audio.length > MAX_AUDIO_BYTES) throw new TranscribeLimit("Recording is too long. Try under 3 minutes.");
  const plan = await getPlan(userId);
  const tier = plan.plan === "pro" ? "pro" : "free";
  const [{ n }] = await q<{ n: number }>("select count(*)::int as n from public.ai_usage where user_id = $1 and feature = 'voice.input' and created_at > now() - interval '1 day'", [userId]);
  if (n >= DAILY_LIMIT[tier]) throw new TranscribeLimit("Aaj ki voice limit poori ho gayi. Kal phir bolo, ya abhi type kar lo.");

  const cfg = await config();
  let result: { text: string; seconds: number } | null = null;
  let used = { provider: "gateway", model: cfg.model };
  let lastErr: unknown = null;
  try {
    result = await viaGateway(audio, mediaType, lang, cfg.model);
  } catch (err) {
    lastErr = err;
    if (process.env.GEMINI_API_KEY) {
      used = { provider: "gemini", model: "gemini-audio" };
      try {
        result = await viaGemini(audio, mediaType, lang);
      } catch (e) {
        lastErr = e;
      }
    }
  }
  const seconds = Math.max(1, Math.round(result?.seconds || audio.length / 4000));
  await q(
    "insert into public.ai_usage (user_id, feature, tier, provider, model, input_tokens, output_tokens, cost_usd, ok) values ($1, 'voice.input', $2, $3, $4, $5, 0, $6, $7)",
    [userId, tier, used.provider, used.model.slice(0, 80), seconds, result ? (seconds / 60) * COST_PER_MIN : 0, Boolean(result)],
  ).catch((e) => console.warn("[voice] usage not recorded:", (e as Error).message));
  if (!result) throw lastErr instanceof AIError ? lastErr : new AIError("Voice could not be understood right now.", "upstream");
  const text = result.text.trim();
  return lang === "hinglish" ? romanise(userId, text) : text;
}
