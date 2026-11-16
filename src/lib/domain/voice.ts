/**
 * AI narrator voices for stories (Vercel AI Gateway speech models).
 * `perChar` is USD per character of text; for token-billed models it is an
 * estimate (about 15 spoken characters per second, 25 audio tokens per second).
 */
export const VOICE_CHOICES = [
  { id: "off", label: "Off · device voice only", perChar: 0, voice: null, hindi: true },
  { id: "google/gemini-3.8-flash-lite-tts", label: "Gemini 3.8 Flash-Lite TTS · natural, cheapest, Hindi", perChar: 0.00001, voice: "Kore", hindi: true },
  { id: "fish-audio/drama-3", label: "Fish Audio Drama 3 · expressive, low cost", perChar: 0.00001, voice: null, hindi: false },
  { id: "google/gemini-3.8-flash-tts", label: "Gemini 3.8 Flash TTS · richer, Hindi", perChar: 0.000015, voice: "Kore", hindi: true },
  { id: "openai/tts-1", label: "OpenAI TTS-1 · clear", perChar: 0.000015, voice: "nova", hindi: true },
  { id: "microsoft/mai-voice-2.1-flash", label: "Microsoft MAI-Voice 2.1 Flash", perChar: 0.000015, voice: null, hindi: true },
  { id: "elevenlabs/eleven-v4-turbo", label: "ElevenLabs v4 Turbo · premium (costly)", perChar: 0.00004, voice: null, hindi: true },
  { id: "elevenlabs/eleven-v4", label: "ElevenLabs v4 · best quality (very costly)", perChar: 0.00008, voice: null, hindi: true },
] as const;

export type VoiceModelId = (typeof VOICE_CHOICES)[number]["id"];

export type VoiceConfig = {
  model: VoiceModelId;
  /** AI-voice stories per calendar month. */
  proPerMonth: number;
  freePerMonth: number;
};

export const DEFAULT_VOICE_CONFIG: VoiceConfig = { model: "google/gemini-3.8-flash-lite-tts", proPerMonth: 20, freePerMonth: 1 };

/** A Pro story is roughly 1,400 words ≈ 8,000 characters. */
export const STORY_CHARS_ESTIMATE = 8_000;

export const voiceChoice = (id: string) => VOICE_CHOICES.find((v) => v.id === id) ?? null;

export function voiceCostUSD(model: string, chars: number) {
  return (voiceChoice(model)?.perChar ?? 0) * chars;
}

export type VoiceAllowance = {
  /** The admin has an AI voice switched on. */
  enabled: boolean;
  plan: "free" | "pro";
  limit: number;
  used: number;
  /** This story already has AI audio this month (continuing it is free). */
  thisStory: boolean;
};

export const canUseAIVoice = (a: VoiceAllowance) => a.enabled && (a.thisStory || a.used < a.limit);
