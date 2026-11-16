import "server-only";
import { getPool } from "@/lib/db/pool";
import { AIError, gatewayToken, gatewayUrl } from "@/lib/ai/client";
import { DEFAULT_VOICE_CONFIG, VOICE_CHOICES, voiceChoice, voiceCostUSD, type VoiceAllowance, type VoiceConfig } from "@/lib/domain/voice";
import { getPlan } from "./plan";

const q = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await getPool().query(sql, params)).rows as T[];

/** Each paragraph can be generated at most this many times per story (cache misses, retries). */
const MAX_PER_PART = 3;
const MAX_PART_CHARS = 4_000;

export async function getVoiceConfig(): Promise<VoiceConfig> {
  const [r] = await q<{ value: Partial<VoiceConfig> }>("select value from public.app_settings where key = 'voice'");
  const v = { ...DEFAULT_VOICE_CONFIG, ...(r?.value ?? {}) };
  if (!voiceChoice(v.model)) v.model = DEFAULT_VOICE_CONFIG.model;
  return v;
}

export async function saveVoiceConfig(input: VoiceConfig) {
  const clean: VoiceConfig = {
    model: VOICE_CHOICES.some((c) => c.id === input.model) ? input.model : DEFAULT_VOICE_CONFIG.model,
    proPerMonth: Math.max(0, Math.min(200, Math.round(input.proPerMonth))),
    freePerMonth: Math.max(0, Math.min(30, Math.round(input.freePerMonth))),
  };
  await q("insert into public.app_settings (key, value) values ('voice', $1) on conflict (key) do update set value = excluded.value", [JSON.stringify(clean)]);
  return clean;
}

const monthStart = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
};

/** How many AI-voice stories this person has left this month. */
export async function voiceAllowance(userId: string, sessionId?: string | null): Promise<VoiceAllowance> {
  const [cfg, plan] = await Promise.all([getVoiceConfig(), getPlan(userId)]);
  const pro = plan.plan === "pro" || plan.isAdmin;
  const [{ used, this_story }] = await q<{ used: number; this_story: boolean }>(
    `select count(distinct session_id)::int as used, coalesce(bool_or(session_id = $3::uuid), false) as this_story
       from public.story_audio where user_id = $1 and created_at >= $2`,
    [userId, monthStart(), sessionId ?? null],
  );
  return { enabled: cfg.model !== "off", plan: pro ? "pro" : "free", limit: pro ? cfg.proPerMonth : cfg.freePerMonth, used, thisStory: this_story };
}

export class VoiceLimit extends Error {}

/** The text for one part of a story: 0 is the title, 1.. are paragraphs. */
export function storyParts(story: { title: string; body: string }) {
  return [story.title, ...story.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)];
}

/**
 * Generates narration for one part of the person's own story. Checks the monthly
 * allowance, caps repeats per part and meters the cost like any other AI call.
 */
export async function narratePart(userId: string, sessionId: string, part: number): Promise<Buffer> {
  const [story] = await q<{ title: string; body: string }>("select title, body from public.generated_stories where session_id = $1 and user_id = $2", [sessionId, userId]);
  if (!story) throw new VoiceLimit("Story not found.");
  const parts = storyParts(story);
  if (part < 0 || part >= parts.length) throw new VoiceLimit("No such part.");
  const text = parts[part].slice(0, MAX_PART_CHARS);

  const cfg = await getVoiceConfig();
  if (cfg.model === "off") throw new VoiceLimit("AI voice is switched off.");
  const allowance = await voiceAllowance(userId, sessionId);
  if (!allowance.thisStory && allowance.used >= allowance.limit) throw new VoiceLimit("You've used this month's AI voice stories.");
  const [{ n }] = await q<{ n: number }>("select count(*)::int as n from public.story_audio where session_id = $1 and part = $2", [sessionId, part]);
  if (n >= MAX_PER_PART) throw new VoiceLimit("This part was already generated. Try again later.");

  const choice = voiceChoice(cfg.model)!;
  const hindi = /[ऀ-ॿ]/.test(text);
  const body: Record<string, unknown> = {
    text,
    outputFormat: "mp3",
    language: hindi ? "hi" : "en",
    instructions: "Narrate like a warm, calm audiobook narrator. Natural pace, gentle pauses between sentences.",
  };
  if (choice.voice) body.voice = choice.voice;

  const call = async (b: Record<string, unknown>) =>
    fetch(`${process.env.AI_SPEECH_URL || gatewayUrl()}/v4/ai/speech-model`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await gatewayToken()}`,
        "ai-gateway-protocol-version": "0.0.1",
        "ai-speech-model-specification-version": "4",
        "ai-model-id": cfg.model,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(b),
      signal: AbortSignal.timeout(60_000),
    });
  let res = await call(body);
  // Voice names differ per provider: retry once with the provider's default voice.
  if (res.status === 400 && body.voice) {
    delete body.voice;
    res = await call(body);
  }
  const ok = res.ok;
  const json = ok ? ((await res.json().catch(() => null)) as { audio?: string } | null) : null;
  const plan = allowance.plan;
  await q(
    "insert into public.ai_usage (user_id, feature, tier, provider, model, input_tokens, output_tokens, cost_usd, ok) values ($1, 'story.audio', $2, 'gateway', $3, $4, 0, $5, $6)",
    [userId, plan, cfg.model, text.length, ok && json?.audio ? voiceCostUSD(cfg.model, text.length) : 0, Boolean(ok && json?.audio)],
  ).catch(() => {});
  if (!ok || !json?.audio) {
    console.warn(`[voice] ${cfg.model} failed: ${res.status} ${ok ? "no audio" : (await res.text().catch(() => "")).slice(0, 200)}`);
    throw new AIError("The AI voice is busy right now. Using the device voice instead.", "upstream");
  }
  await q("insert into public.story_audio (user_id, session_id, part, chars, model) values ($1, $2, $3, $4, $5)", [userId, sessionId, part, text.length, cfg.model]);
  return Buffer.from(json.audio, "base64");
}
