/**
 * List prices in USD per 1M tokens [input, output], from the Vercel AI
 * Gateway catalog (Nov 2026). Gemini direct API prices match Google's list
 * prices; a free-tier Gemini key actually costs $0 until its quota runs out.
 */
export const PRICES: Record<string, [number, number]> = {
  "gemini-3.1-flash-lite": [0.25, 1.5],
  "gemini-3.5-flash-lite": [0.3, 2.5],
  "gemini-3.6-flash": [0.75, 3.75],
  "gemini-3.7-flash": [0.75, 3.75],
  "gemini-3.8-flash": [0.75, 3.75],
  "gemini-3.5-flash": [1.5, 9],
  "gemini-2.5-flash": [0.3, 2.5],
  "gemini-2.5-flash-lite": [0.1, 0.4],
  "claude-haiku-5.5": [0.1, 0.5],
  "claude-haiku-5-5": [0.1, 0.5],
  "claude-sonnet-4.6": [3, 15],
  "claude-sonnet-5-5": [3, 15],
  "claude-opus-5.5": [4, 20],
  "claude-opus-5-5": [4, 20],
  "gpt-5-mini": [0.25, 2],
  "gpt-5-nano": [0.05, 0.4],
};

export function normaliseModel(model: string) {
  return model.replace(/^(models\/|google\/|anthropic\/|openai\/)/, "").toLowerCase();
}

export function priceFor(model: string): [number, number] | null {
  return PRICES[normaliseModel(model)] ?? null;
}

export function costUSD(model: string, input: number, output: number): number {
  const p = priceFor(model);
  return p ? (input * p[0] + output * p[1]) / 1_000_000 : 0;
}

/** Models an admin can assign to the Free or Pro tier. */
export const TIER_CHOICES = [
  { id: "default", provider: "default", model: "", label: "App default (Gemini key, free quota)" },
  { id: "gemini:gemini-3.1-flash-lite", provider: "gemini", model: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite · cheapest Gemini" },
  { id: "gemini:gemini-3.5-flash-lite", provider: "gemini", model: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite" },
  { id: "gemini:gemini-3.7-flash", provider: "gemini", model: "gemini-3.7-flash", label: "Gemini 3.7 Flash · balanced" },
  { id: "gemini:gemini-3.5-flash", provider: "gemini", model: "gemini-3.5-flash", label: "Gemini 3.5 Flash · higher quality" },
  { id: "gateway:anthropic/claude-haiku-5.5", provider: "gateway", model: "anthropic/claude-haiku-5.5", label: "Claude Haiku 5.5 · very low cost (AI Gateway)" },
  { id: "gateway:anthropic/claude-sonnet-4.6", provider: "gateway", model: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6 · premium writing (AI Gateway)" },
  { id: "gateway:anthropic/claude-opus-5.5", provider: "gateway", model: "anthropic/claude-opus-5.5", label: "Claude Opus 5.5 · top quality, expensive (AI Gateway)" },
] as const;

/** Rough tokens for one full daily session (check-in, plan, story, 3 evaluations, reflection). */
export const SESSION_TOKENS_ESTIMATE = { input: 55_000, output: 13_000 };
