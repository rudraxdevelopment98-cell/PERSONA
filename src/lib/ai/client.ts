import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { toOutputSchema } from "./output-schema";

/**
 * AI provider switch. Set AI_PROVIDER to choose explicitly, or leave it unset
 * and the first configured provider is used:
 *
 *   gemini    - Google Gemini (GEMINI_API_KEY; free tier available)
 *   anthropic - Claude API directly (ANTHROPIC_API_KEY)
 *   gateway   - Claude through Vercel AI Gateway; on Vercel it authenticates with
 *               the deployment's OIDC token, so no key is needed
 *
 * AI_MODEL overrides the default model for whichever provider is active.
 * Switching providers is a single environment-variable change - no code edits.
 */
export type ProviderKind = "gemini" | "anthropic" | "gateway";
type Provider = { kind: ProviderKind; model: string };

const DEFAULT_MODELS: Record<ProviderKind, string> = {
  gemini: "gemini-3.8-flash",
  anthropic: "claude-opus-5-5",
  gateway: "anthropic/claude-opus-5.5",
};

export function activeProvider(): Provider {
  const requested = process.env.AI_PROVIDER?.trim().toLowerCase();
  let kind: ProviderKind;
  if (requested === "gemini" || requested === "anthropic" || requested === "gateway") kind = requested;
  else if (process.env.GEMINI_API_KEY) kind = "gemini";
  else if (process.env.ANTHROPIC_API_KEY) kind = "anthropic";
  else kind = "gateway";
  return { kind, model: process.env.AI_MODEL || DEFAULT_MODELS[kind] };
}

export class AIError extends Error {
  constructor(
    message: string,
    public readonly code: "not_configured" | "refusal" | "truncated" | "invalid_output" | "upstream",
  ) {
    super(message);
  }
}

type Effort = "low" | "medium" | "high";
type ChatMessage = { role: "user" | "assistant"; content: string };

const REFUSAL_NOTE =
  "\n\nI can't help with that particular request. If you are going through something difficult, please consider speaking with a qualified professional or someone you trust.";

function parseAndValidate<S extends z.ZodType>(text: string, schema: S): z.infer<S> {
  let raw: unknown;
  try {
    raw = JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    throw new AIError("The AI returned malformed output. Please try again.", "invalid_output");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new AIError("The AI returned output in an unexpected shape. Please try again.", "invalid_output");
  return parsed.data;
}

// ---------------------------------------------------------------------------
// Claude (direct API or Vercel AI Gateway)
// ---------------------------------------------------------------------------

// Server-side refusal fallback (Claude API only): if a safety classifier
// declines, the API re-runs the request on a suitable fallback model.
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5", "claude-fable-5-2", "claude-fable-5-1"]);
const FALLBACK_BETA = "server-side-fallback-2026-07-01";
const GATEWAY_URL = process.env.AI_GATEWAY_URL || "https://ai-gateway.vercel.sh";

let directClient: Anthropic | null = null;

async function anthropicClient(p: Provider): Promise<Anthropic> {
  if (p.kind === "anthropic") {
    if (!process.env.ANTHROPIC_API_KEY) throw new AIError("AI_PROVIDER is 'anthropic' but ANTHROPIC_API_KEY is not set.", "not_configured");
    directClient ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 2 });
    return directClient;
  }
  let token = process.env.AI_GATEWAY_API_KEY;
  if (!token) {
    try {
      const { getVercelOidcToken } = await import("@vercel/oidc");
      token = await getVercelOidcToken();
    } catch {
      token = undefined;
    }
  }
  if (!token) {
    throw new AIError("The AI service is not configured. Set GEMINI_API_KEY, or deploy on Vercel to use AI Gateway.", "not_configured");
  }
  // OIDC tokens are short-lived, so build a client per request.
  return new Anthropic({ apiKey: token, baseURL: GATEWAY_URL, maxRetries: 2 });
}

type StreamParams = Parameters<Anthropic["messages"]["stream"]>[0];

/** Opens a stream; uses the beta endpoint only when the refusal-fallback beta applies. */
function openClaudeStream(anthropic: Anthropic, p: Provider, params: StreamParams) {
  if (p.kind === "anthropic" && FALLBACK_MODELS.has(p.model)) {
    return anthropic.beta.messages.stream({ ...(params as object), betas: [FALLBACK_BETA], fallbacks: "default" } as Parameters<
      Anthropic["beta"]["messages"]["stream"]
    >[0]);
  }
  return anthropic.messages.stream(params);
}

function mapClaudeError(err: unknown): never {
  if (err instanceof AIError) throw err;
  if (err instanceof Anthropic.RateLimitError) throw new AIError("The AI service is busy. Please try again in a minute.", "upstream");
  if (err instanceof Anthropic.AuthenticationError) throw new AIError("The AI service rejected the server's credentials.", "not_configured");
  if (err instanceof Anthropic.APIError) throw new AIError(`The AI service returned an error (${err.status ?? "network"}).`, "upstream");
  throw err;
}

async function claudeStructured(p: Provider, system: string, prompt: string, jsonSchema: Record<string, unknown>, effort: Effort, maxTokens: number) {
  const anthropic = await anthropicClient(p);
  try {
    const stream = openClaudeStream(anthropic, p, {
      model: p.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
      output_config: { effort, format: { type: "json_schema", schema: jsonSchema } },
    });
    const message = (await stream.finalMessage()) as { stop_reason: string | null; content: { type: string; text?: string }[] };
    if (message.stop_reason === "refusal") throw new AIError("The AI declined to generate this content. Try rephrasing your input.", "refusal");
    if (message.stop_reason === "max_tokens") throw new AIError("The AI response was cut off. Please try again.", "truncated");
    return message.content.flatMap((b) => (b.type === "text" && b.text ? [b.text] : [])).join("");
  } catch (err) {
    mapClaudeError(err);
  }
}

async function* claudeText(p: Provider, system: string, messages: ChatMessage[], effort: Effort, maxTokens: number): AsyncGenerator<string> {
  const anthropic = await anthropicClient(p);
  try {
    const stream = openClaudeStream(anthropic, p, { model: p.model, max_tokens: maxTokens, system, messages, output_config: { effort } });
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") yield REFUSAL_NOTE;
  } catch (err) {
    mapClaudeError(err);
  }
}

// ---------------------------------------------------------------------------
// Google Gemini
// ---------------------------------------------------------------------------

type ThinkingLevel = import("@google/genai").ThinkingLevel;

async function geminiClient() {
  if (!process.env.GEMINI_API_KEY) throw new AIError("AI_PROVIDER is 'gemini' but GEMINI_API_KEY is not set.", "not_configured");
  const { GoogleGenAI } = await import("@google/genai");
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    // v1beta carries JSON-schema output and thinking configuration.
    httpOptions: {
      apiVersion: process.env.GEMINI_API_VERSION || "v1beta",
      // Fail a single slow request well before the platform's function time limit.
      timeout: 120_000,
      ...(process.env.GEMINI_BASE_URL ? { baseUrl: process.env.GEMINI_BASE_URL } : {}),
    },
  });
}

const GEMINI_THINKING: Record<Effort, number> = { low: 512, medium: 2048, high: 8192 };

/**
 * Gemini 2.x takes a token budget; Gemini 3+ takes a thinking level and may
 * ignore the budget (defaulting to slow, heavy thinking). Keep thinking light:
 * these tasks need good writing more than long deliberation.
 */
function geminiThinking(model: string, effort: Effort) {
  if (/^gemini-2\./.test(model)) return { thinkingBudget: GEMINI_THINKING[effort] };
  return { thinkingLevel: (effort === "high" ? "MEDIUM" : "LOW") as ThinkingLevel };
}

function mapGeminiError(err: unknown): never {
  if (err instanceof AIError) throw err;
  const status = (err as { status?: number })?.status;
  // Google's error text helps diagnose configuration problems; it never contains the key.
  console.error(`[ai] Gemini request failed (${status ?? "network"}): ${String((err as Error)?.message ?? err).slice(0, 500)}`);
  if (status === 429) throw new AIError("The free AI limit was reached for now. Please try again in a minute.", "upstream");
  if (status && TRANSIENT.has(status)) throw new AIError("The AI service is very busy right now. Please try again in a minute.", "upstream");
  if (status === 401 || status === 403) throw new AIError("The AI service rejected the server's credentials.", "not_configured");
  if (status) throw new AIError(`The AI service returned an error (${status}).`, "upstream");
  throw new AIError("The AI service could not be reached. Please try again.", "upstream");
}

type GeminiChunk = { text?: string; candidates?: { finishReason?: string }[]; promptFeedback?: { blockReason?: string } };

function checkGeminiFinish(last: GeminiChunk | null) {
  if (last?.promptFeedback?.blockReason) throw new AIError("The AI declined to generate this content. Try rephrasing your input.", "refusal");
  const reason = last?.candidates?.[0]?.finishReason;
  if (reason === "SAFETY" || reason === "PROHIBITED_CONTENT" || reason === "BLOCKLIST") {
    throw new AIError("The AI declined to generate this content. Try rephrasing your input.", "refusal");
  }
  if (reason === "MAX_TOKENS") throw new AIError("The AI response was cut off. Please try again.", "truncated");
}

/**
 * Models tried in order if the configured one is unavailable (HTTP 404). Google
 * retires models for new accounts over time, so when its error names a
 * replacement model, that model is tried next. The first model that works is
 * remembered for the lifetime of the server instance.
 */
const GEMINI_FALLBACK_MODELS = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash"];
let workingGeminiModel: string | null = null;

const errStatus = (err: unknown) => (err as { status?: number })?.status;
const errText = (err: unknown) => String((err as Error)?.message ?? err);

function suggestedGeminiModel(err: unknown): string | null {
  const m = /use (?:models\/)?(gemini-[a-z0-9.\-]*[a-z0-9])/i.exec(errText(err));
  return m ? m[1] : null;
}

const TRANSIENT = new Set([500, 502, 503, 504]);
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withGeminiModelFallback<T>(p: Provider, fn: (model: string) => Promise<T>): Promise<T> {
  const queue = [...new Set([workingGeminiModel ?? p.model, p.model, ...GEMINI_FALLBACK_MODELS])];
  const tried = new Set<string>();
  let lastErr: unknown;
  while (queue.length > 0) {
    const model = queue.shift()!;
    if (tried.has(model)) continue;
    tried.add(model);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await fn(model);
        workingGeminiModel = model;
        return result;
      } catch (err) {
        lastErr = err;
        const status = errStatus(err);
        if (/abort/i.test(errText(err))) {
          console.warn(`[ai] Gemini model "${model}" timed out; trying another model.`);
          break;
        }
        // Overloaded: wait briefly and retry once, then move on to the next model.
        if (status && TRANSIENT.has(status)) {
          console.warn(`[ai] Gemini model "${model}" is busy (${status}); ${attempt === 0 ? "retrying" : "trying another model"}.`);
          if (attempt === 0) {
            await pause(1500);
            continue;
          }
          break;
        }
        if (status !== 404) throw err;
        const suggestion = suggestedGeminiModel(err);
        if (suggestion && !tried.has(suggestion)) queue.unshift(suggestion);
        console.warn(`[ai] Gemini model "${model}" is unavailable (${errText(err).slice(0, 300)}); trying ${queue[0] ?? "nothing else"}.`);
        break;
      }
    }
  }
  throw lastErr;
}

/**
 * Request variants, from richest to most compatible. A 400 (unsupported
 * setting) moves to the next variant: first dropping the thinking setting,
 * then the JSON schema (which then goes in the prompt; Zod still validates).
 */
const STRUCTURED_VARIANTS = [
  { schema: true, thinking: true },
  { schema: true, thinking: false },
  { schema: false, thinking: false },
];

async function geminiStructured(p: Provider, system: string, prompt: string, jsonSchema: Record<string, unknown>, effort: Effort, maxTokens: number) {
  const ai = await geminiClient();
  let lastErr: unknown;
  for (const v of STRUCTURED_VARIANTS) {
    try {
      return await withGeminiModelFallback(p, async (model) => {
        const stream = await ai.models.generateContentStream({
          model,
          contents: [
            { role: "user", parts: [{ text: v.schema ? prompt : `${prompt}\n\nRespond with JSON only, matching this JSON Schema:\n${JSON.stringify(jsonSchema)}` }] },
          ],
          config: {
            systemInstruction: system,
            maxOutputTokens: maxTokens,
            responseMimeType: "application/json",
            ...(v.schema ? { responseJsonSchema: jsonSchema } : {}),
            ...(v.thinking ? { thinkingConfig: geminiThinking(model, effort) } : {}),
          },
        });
        const started = Date.now();
        let firstAt = 0;
        let text = "";
        let last: GeminiChunk | null = null;
        for await (const chunk of stream) {
          if (!firstAt && chunk.text) firstAt = Date.now();
          text += chunk.text ?? "";
          last = chunk as GeminiChunk;
        }
        console.log(`[ai] ${model} structured: first text ${firstAt ? firstAt - started : -1} ms, total ${Date.now() - started} ms, ${text.length} chars`);
        checkGeminiFinish(last);
        return text;
      });
    } catch (err) {
      lastErr = err;
      if (errStatus(err) !== 400) break;
      console.warn(`[ai] Gemini rejected a request setting (${errText(err).slice(0, 200)}); retrying with a simpler request.`);
    }
  }
  mapGeminiError(lastErr);
}

async function* geminiText(p: Provider, system: string, messages: ChatMessage[], effort: Effort, maxTokens: number): AsyncGenerator<string> {
  const ai = await geminiClient();
  const open = (thinking: boolean) =>
    withGeminiModelFallback(p, (model) =>
      ai.models.generateContentStream({
        model,
        contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        config: {
          systemInstruction: system,
          maxOutputTokens: maxTokens,
          ...(thinking ? { thinkingConfig: geminiThinking(model, effort) } : {}),
        },
      }),
    );
  try {
    let stream;
    try {
      stream = await open(true);
    } catch (err) {
      if (errStatus(err) !== 400) throw err;
      stream = await open(false);
    }
    let last: GeminiChunk | null = null;
    for await (const chunk of stream) {
      if (chunk.text) yield chunk.text;
      last = chunk as GeminiChunk;
    }
    try {
      checkGeminiFinish(last);
    } catch (e) {
      if (e instanceof AIError && e.code === "refusal") yield REFUSAL_NOTE;
      else throw e;
    }
  } catch (err) {
    mapGeminiError(err);
  }
}

// ---------------------------------------------------------------------------
// Public API (provider-agnostic)
// ---------------------------------------------------------------------------

/**
 * One request that must return JSON matching `schema`. Streams under the hood
 * so long generations (e.g. 1,500-word stories) do not hit HTTP timeouts.
 */
export async function generateStructured<S extends z.ZodType>(opts: {
  system: string;
  prompt: string;
  schema: S;
  effort?: Effort;
  maxTokens?: number;
}): Promise<z.infer<S>> {
  const p = activeProvider();
  const jsonSchema = toOutputSchema(z.toJSONSchema(opts.schema, { io: "input" })) as Record<string, unknown>;
  const effort = opts.effort ?? "medium";
  const maxTokens = opts.maxTokens ?? 16000;
  const text =
    p.kind === "gemini"
      ? await geminiStructured(p, opts.system, opts.prompt, jsonSchema, effort, maxTokens)
      : await claudeStructured(p, opts.system, opts.prompt, jsonSchema, effort, maxTokens);
  return parseAndValidate(text, opts.schema);
}

/** Streams plain-text deltas (used by the AI Coach). */
export async function* streamText(opts: { system: string; messages: ChatMessage[]; effort?: Effort; maxTokens?: number }): AsyncGenerator<string> {
  const p = activeProvider();
  const effort = opts.effort ?? "medium";
  const maxTokens = opts.maxTokens ?? 8000;
  yield* p.kind === "gemini" ? geminiText(p, opts.system, opts.messages, effort, maxTokens) : claudeText(p, opts.system, opts.messages, effort, maxTokens);
}
