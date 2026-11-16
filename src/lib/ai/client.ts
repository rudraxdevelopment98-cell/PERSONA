import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { toOutputSchema } from "./output-schema";
import { languageInstruction, type Language } from "./prompts";

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
export type ProviderKind = "gemini" | "anthropic" | "gateway" | "openai" | "openrouter";
/** `apiKey` is set when the user connected their own provider. */
type Provider = { kind: ProviderKind; model: string; apiKey?: string };

/** A user's own AI connection (decrypted), applied for the duration of one request. */
export type UserAIOverride = { provider: "openrouter" | "anthropic" | "gemini" | "openai"; model: string; apiKey: string };
const userAI = new AsyncLocalStorage<UserAIOverride | null>();

/** Runs `fn` so that every AI call inside it uses the given user's provider. */
export function runWithUserAI<T>(ai: UserAIOverride | null, fn: () => T): T {
  return userAI.run(ai, fn);
}

/** Who and what an AI call is for (set per request), used for metering and plan tiers. */
export type AIContext = { userId: string | null; feature: string; tier: "free" | "pro" };
const aiContext = new AsyncLocalStorage<AIContext>();
export function runWithAIContext<T>(ctx: AIContext, fn: () => T): T {
  return aiContext.run(ctx, fn);
}

/** Token counts reported by the provider for the call in progress. */
type Meter = { model?: string; input?: number; output?: number };
const meterStore = new AsyncLocalStorage<Meter>();
function meter(model: string, input?: number, output?: number) {
  const m = meterStore.getStore();
  if (!m) return;
  m.model = model;
  if (input != null) m.input = input;
  if (output != null) m.output = output;
}

type TierChoice = { provider: "default" | "gemini" | "gateway"; model: string };
type TierConfig = { free?: TierChoice; pro?: TierChoice; light?: TierChoice; lightForPro?: boolean };
let tierCache: { at: number; value: TierConfig } | null = null;

/** Quick, structured tasks that a cheaper model handles well (feedback, check-ins, coach). */
const LIGHT_FEATURES = new Set([
  "checkin.start",
  "checkin.submit",
  "session.scenario",
  "session.reflect",
  "decision.new",
  "decision.submit",
  "communication.new",
  "communication.submit",
  "coach",
]);
export const isLightFeature = (f: string) => LIGHT_FEATURES.has(f);

/** Admin-chosen models per plan (cached briefly; each server bundle keeps its own copy). */
async function tierConfig(): Promise<TierConfig> {
  if (tierCache && Date.now() - tierCache.at < 10_000) return tierCache.value;
  try {
    const { getPool } = await import("@/lib/db/pool");
    const { rows } = await getPool().query("select value from public.app_settings where key = 'ai_tiers'");
    tierCache = { at: Date.now(), value: rows[0]?.value ?? {} };
  } catch {
    tierCache = { at: Date.now(), value: {} };
  }
  return tierCache.value;
}

export function clearTierCache() {
  tierCache = null;
}

/** The provider for this request: the user's own key, else their plan's model, else the app default. */
async function resolveProvider(): Promise<Provider> {
  const own = userAI.getStore();
  if (own) return { kind: own.provider, model: own.model, apiKey: own.apiKey };
  const ctx = aiContext.getStore();
  const cfg = await tierConfig();
  const tier = ctx?.tier ?? "free";
  // Everyday tasks can run on a cheaper model (always for Free, optionally for Pro).
  const useLight = cfg.light && cfg.light.provider !== "default" && isLightFeature(ctx?.feature ?? "") && (tier === "free" || cfg.lightForPro);
  const choice = useLight ? cfg.light : cfg[tier];
  if (choice && choice.provider !== "default" && choice.model) return { kind: choice.provider, model: choice.model };
  return appProvider();
}

async function recordUsage(p: Provider, m: Meter, approxIn: number, approxOut: number, ok: boolean) {
  try {
    const ctx = aiContext.getStore();
    const model = m.model ?? p.model;
    const input = m.input ?? Math.ceil(approxIn / 3.5);
    const output = m.output ?? Math.ceil(approxOut / 3.5);
    const byo = Boolean(p.apiKey);
    const { costUSD } = await import("@/lib/domain/ai-pricing");
    const { getPool } = await import("@/lib/db/pool");
    await getPool().query(
      "insert into public.ai_usage (user_id, feature, tier, provider, model, input_tokens, output_tokens, cost_usd, ok) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
      [ctx?.userId ?? null, (ctx?.feature ?? "other").slice(0, 60), byo ? "byo" : (ctx?.tier ?? "system"), p.kind, model.slice(0, 80), input, output, byo ? 0 : costUSD(model, input, output), ok],
    );
  } catch (err) {
    console.warn("[ai] usage not recorded:", (err as Error).message);
  }
}

const DEFAULT_MODELS: Record<"gemini" | "anthropic" | "gateway", string> = {
  gemini: "gemini-3.6-flash",
  anthropic: "claude-opus-5-5",
  gateway: "anthropic/claude-opus-5.5",
};

/** The app's own provider, ignoring any user connection. */
export function appProvider(): Provider {
  const requested = process.env.AI_PROVIDER?.trim().toLowerCase();
  let kind: "gemini" | "anthropic" | "gateway";
  if (requested === "gemini" || requested === "anthropic" || requested === "gateway") kind = requested;
  else if (process.env.GEMINI_API_KEY) kind = "gemini";
  else if (process.env.ANTHROPIC_API_KEY) kind = "anthropic";
  else kind = "gateway";
  return { kind, model: process.env.AI_MODEL || DEFAULT_MODELS[kind] };
}

/** The provider for the current request: the user's own connection if any, else the app's. */
export function activeProvider(): Provider {
  const own = userAI.getStore();
  if (own) return { kind: own.provider, model: own.model, apiKey: own.apiKey };
  return appProvider();
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

const OWN_KEY_REJECTED = "Your connected AI key was rejected. Update or disconnect it in Settings → Your AI.";
type ChatMessage = { role: "user" | "assistant"; content: string };

const REFUSAL_NOTE =
  "\n\nI can't help with that particular request. If you are going through something difficult, please consider speaking with a qualified professional or someone you trust.";

function parseAndValidate<S extends z.ZodType>(text: string, schema: S): z.infer<S> {
  let raw: unknown;
  try {
    raw = JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    console.error(`[ai] Output was not valid JSON (${text.length} chars).`);
    throw new AIError("The AI returned malformed output. Please try again.", "invalid_output");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    // Log only field paths and issue codes - never the user's content.
    console.error(`[ai] Output failed validation: ${parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".") || "(root)"}: ${i.code}`).join("; ")}`);
    throw new AIError("The AI returned output in an unexpected shape. Please try again.", "invalid_output");
  }
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
  if (p.kind === "anthropic" && p.apiKey) return new Anthropic({ apiKey: p.apiKey, maxRetries: 2 });
  if (p.kind === "anthropic") {
    if (!process.env.ANTHROPIC_API_KEY) throw new AIError("AI_PROVIDER is 'anthropic' but ANTHROPIC_API_KEY is not set.", "not_configured");
    directClient ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 2 });
    return directClient;
  }
  // OIDC tokens are short-lived, so build a client per request.
  return new Anthropic({ apiKey: await gatewayToken(), baseURL: GATEWAY_URL, maxRetries: 2 });
}

/** Credentials for Vercel AI Gateway: an API key if set, else the deployment's OIDC token. */
export async function gatewayToken(): Promise<string> {
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
  return token;
}

export const gatewayUrl = () => GATEWAY_URL;

type StreamParams = Parameters<Anthropic["messages"]["stream"]>[0];

/** Opens a stream; uses the beta endpoint only when the refusal-fallback beta applies. */
function openClaudeStream(anthropic: Anthropic, p: Provider, params: StreamParams) {
  if (p.kind === "anthropic" && !p.apiKey && FALLBACK_MODELS.has(p.model)) {
    return anthropic.beta.messages.stream({ ...(params as object), betas: [FALLBACK_BETA], fallbacks: "default" } as Parameters<
      Anthropic["beta"]["messages"]["stream"]
    >[0]);
  }
  return anthropic.messages.stream(params);
}

function mapClaudeError(err: unknown): never {
  if (err instanceof AIError) throw err;
  if (err instanceof Anthropic.RateLimitError) throw new AIError("The AI service is busy. Please try again in a minute.", "upstream");
  if (err instanceof Anthropic.AuthenticationError) throw new AIError(userAI.getStore() ? OWN_KEY_REJECTED : "The AI service rejected the server's credentials.", "not_configured");
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
    const message = (await stream.finalMessage()) as { stop_reason: string | null; content: { type: string; text?: string }[]; usage?: { input_tokens?: number; output_tokens?: number } };
    meter(p.model, message.usage?.input_tokens, message.usage?.output_tokens);
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

async function geminiClient(p: Provider) {
  const apiKey = p.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AIError("AI_PROVIDER is 'gemini' but GEMINI_API_KEY is not set.", "not_configured");
  const { GoogleGenAI } = await import("@google/genai");
  return new GoogleGenAI({
    apiKey,
    // v1beta carries JSON-schema output and thinking configuration.
    httpOptions: {
      apiVersion: process.env.GEMINI_API_VERSION || "v1beta",
      // Backstop only; each request also carries its own abort signal.
      timeout: 180_000,
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
  if (status === 401 || status === 403 || (status === 400 && /api key/i.test(errText(err)))) {
    throw new AIError(userAI.getStore() ? OWN_KEY_REJECTED : "The AI service rejected the server's credentials.", "not_configured");
  }
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
 * Models tried in order when the configured one is unavailable (404), busy
 * (5xx) or too slow. Google retires models for new accounts over time, so a
 * replacement named in a 404 is tried next. The first model that works is
 * remembered for the lifetime of the server instance.
 */
const GEMINI_FALLBACK_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.7-flash"];
/** Per requested model: the model that last worked in its place (so admin-chosen models are respected). */
const workingGeminiModel = new Map<string, string>();

const errStatus = (err: unknown) => (err as { status?: number })?.status;
const errText = (err: unknown) => String((err as Error)?.message ?? err);

function suggestedGeminiModel(err: unknown): string | null {
  const m = /use (?:models\/)?(gemini-[a-z0-9.\-]*[a-z0-9])/i.exec(errText(err));
  return m ? m[1] : null;
}

const TRANSIENT = new Set([429, 500, 502, 503, 504]);
const isTimeout = (err: unknown) => /abort|timed? ?out/i.test(errText(err)) || (err as Error)?.name === "TimeoutError";

/** Overall time available for one AI operation (functions are allowed 300 s). */
const OPERATION_BUDGET_MS = 270_000;

/**
 * Runs `fn` against successive models until one succeeds. Each attempt gets
 * `attemptMs` (bounded by the overall deadline) and an AbortSignal to enforce it.
 * Busy, slow and missing models are skipped immediately - no waiting on the same
 * overloaded model.
 */
async function withGeminiModelFallback<T>(
  p: Provider,
  deadline: number,
  attemptMs: number,
  fn: (model: string, signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const missing = new Set<string>();
  let lastErr: unknown = new AIError("The AI service is very busy right now. Please try again in a minute.", "upstream");
  // Pass 1 uses the normal time per attempt; if every model was busy or slow,
  // pass 2 retries them with double the time (load spikes are usually short).
  for (let pass = 0; pass < 2; pass++) {
    const queue = [...new Set([p.apiKey ? p.model : (workingGeminiModel.get(p.model) ?? p.model), p.model, ...GEMINI_FALLBACK_MODELS])];
    const tried = new Set<string>();
    const perAttempt = attemptMs * (pass + 1);
    while (queue.length > 0) {
      const remaining = deadline - Date.now();
      if (remaining < 8_000) break;
      const model = queue.shift()!;
      if (tried.has(model) || missing.has(model)) continue;
      tried.add(model);
      try {
        const result = await fn(model, AbortSignal.timeout(Math.min(perAttempt, remaining - 3_000)));
        if (!p.apiKey) workingGeminiModel.set(p.model, model);
        return result;
      } catch (err) {
        lastErr = err;
        const status = errStatus(err);
        if (isTimeout(err)) {
          console.warn(`[ai] Gemini model "${model}" was too slow (${Math.round(perAttempt / 1000)} s); trying another model.`);
          if (workingGeminiModel.get(p.model) === model) workingGeminiModel.delete(p.model);
          continue;
        }
        if (status && TRANSIENT.has(status)) {
          console.warn(`[ai] Gemini model "${model}" is busy (${status}); trying another model.`);
          if (workingGeminiModel.get(p.model) === model) workingGeminiModel.delete(p.model);
          continue;
        }
        if (status !== 404) throw err;
        missing.add(model);
        const suggestion = suggestedGeminiModel(err);
        if (suggestion && !tried.has(suggestion) && !missing.has(suggestion)) queue.unshift(suggestion);
        console.warn(`[ai] Gemini model "${model}" is unavailable (${errText(err).slice(0, 300)}); trying ${queue[0] ?? "nothing else"}.`);
      }
    }
    if (deadline - Date.now() < 8_000) break;
    if (pass === 0) console.warn("[ai] All Gemini models were busy or slow; retrying with more time.");
  }
  if (isTimeout(lastErr) || (errStatus(lastErr) && TRANSIENT.has(errStatus(lastErr)!))) {
    throw new AIError("The free AI service is very busy right now. Please try again in a few minutes.", "upstream");
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
  const ai = await geminiClient(p);
  const deadline = Date.now() + OPERATION_BUDGET_MS;
  // Long generations (the daily story) get more time per attempt than short ones.
  const attemptMs = maxTokens > 16_000 ? 120_000 : 30_000;
  let lastErr: unknown;
  for (const v of STRUCTURED_VARIANTS) {
    try {
      return await withGeminiModelFallback(p, deadline, attemptMs, async (model, signal) => {
        const started = Date.now();
        const stream = await ai.models.generateContentStream({
          model,
          contents: [
            { role: "user", parts: [{ text: v.schema ? prompt : `${prompt}\n\nRespond with JSON only, matching this JSON Schema:\n${JSON.stringify(jsonSchema)}` }] },
          ],
          config: {
            abortSignal: signal,
            systemInstruction: system,
            maxOutputTokens: maxTokens,
            responseMimeType: "application/json",
            ...(v.schema ? { responseJsonSchema: jsonSchema } : {}),
            ...(v.thinking ? { thinkingConfig: geminiThinking(model, effort) } : {}),
          },
        });
        let firstAt = 0;
        let text = "";
        let last: GeminiChunk | null = null;
        for await (const chunk of stream) {
          if (!firstAt && chunk.text) firstAt = Date.now();
          text += chunk.text ?? "";
          last = chunk as GeminiChunk;
        }
        console.log(`[ai] ${model} structured: first text ${firstAt ? firstAt - started : -1} ms, total ${Date.now() - started} ms, ${text.length} chars`);
        const um = (last as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number } } | null)?.usageMetadata;
        meter(model, um?.promptTokenCount, um ? (um.candidatesTokenCount ?? 0) + (um.thoughtsTokenCount ?? 0) : undefined);
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
  const ai = await geminiClient(p);
  const deadline = Date.now() + OPERATION_BUDGET_MS;
  const open = (thinking: boolean) =>
    withGeminiModelFallback(p, deadline, 90_000, (model, signal) =>
      ai.models.generateContentStream({
        model,
        contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        config: {
          abortSignal: signal,
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
// OpenAI-compatible chat completions (OpenAI and OpenRouter, user keys only)
// ---------------------------------------------------------------------------

const OAI_BASE = {
  openai: process.env.USER_OPENAI_BASE_URL || "https://api.openai.com/v1",
  openrouter: process.env.USER_OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
};

function oaiHeaders(p: Provider): Record<string, string> {
  const h: Record<string, string> = { Authorization: `Bearer ${p.apiKey}`, "Content-Type": "application/json" };
  if (p.kind === "openrouter") {
    h["HTTP-Referer"] = process.env.NEXT_PUBLIC_SITE_URL || "https://persona-90.vercel.app";
    h["X-Title"] = "PERSONA 90";
  }
  return h;
}

async function oaiError(res: Response): Promise<never> {
  const body = await res.text().catch(() => "");
  console.error(`[ai] ${res.url.split("?")[0]} failed (${res.status}): ${body.slice(0, 300)}`);
  if (res.status === 401 || res.status === 403) throw new AIError(OWN_KEY_REJECTED, "not_configured");
  if (res.status === 402) throw new AIError("Your connected AI account has run out of credits. Add credits or disconnect it in Settings → Your AI.", "not_configured");
  if (res.status === 404) throw new AIError("Your chosen AI model is not available. Pick another model in Settings → Your AI.", "not_configured");
  if (res.status === 429 || res.status >= 500) throw new AIError("Your AI provider is busy right now. Please try again in a minute.", "upstream");
  throw Object.assign(new AIError(`Your AI provider returned an error (${res.status}).`, "upstream"), { status: res.status });
}

type OaiChoice = { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string };

async function oaiStructured(p: Provider, system: string, prompt: string, jsonSchema: Record<string, unknown>, maxTokens: number): Promise<string> {
  const base = OAI_BASE[p.kind as "openai" | "openrouter"];
  // Strict JSON schema first; some models only support plain JSON mode.
  const formats: Record<string, unknown>[] = [
    { type: "json_schema", json_schema: { name: "output", strict: true, schema: jsonSchema } },
    { type: "json_object" },
  ];
  let lastErr: unknown;
  for (const [i, format] of formats.entries()) {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: oaiHeaders(p),
      signal: AbortSignal.timeout(240_000),
      body: JSON.stringify({
        model: p.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: i === 0 ? prompt : `${prompt}\n\nRespond with JSON only, matching this JSON Schema:\n${JSON.stringify(jsonSchema)}` },
        ],
        response_format: format,
        ...(p.kind === "openai" ? { max_completion_tokens: maxTokens } : { max_tokens: maxTokens }),
      }),
    }).catch((err) => {
      throw new AIError(/timeout|abort/i.test(String(err)) ? "Your AI provider took too long. Please try again." : "Could not reach your AI provider.", "upstream");
    });
    if (!res.ok) {
      try {
        await oaiError(res);
      } catch (err) {
        lastErr = err;
        if ((err as { status?: number }).status === 400 && i === 0) continue;
        throw err;
      }
    }
    const data = (await res.json()) as { choices?: OaiChoice[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
    meter(p.model, data.usage?.prompt_tokens, data.usage?.completion_tokens);
    const choice = data.choices?.[0];
    if (choice?.message?.refusal || choice?.finish_reason === "content_filter") {
      throw new AIError("The AI declined to generate this content. Try rephrasing your input.", "refusal");
    }
    if (choice?.finish_reason === "length") throw new AIError("The AI response was cut off. Please try again.", "truncated");
    return choice?.message?.content ?? "";
  }
  throw lastErr;
}

async function* oaiText(p: Provider, system: string, messages: ChatMessage[], maxTokens: number): AsyncGenerator<string> {
  const base = OAI_BASE[p.kind as "openai" | "openrouter"];
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: oaiHeaders(p),
    signal: AbortSignal.timeout(240_000),
    body: JSON.stringify({
      model: p.model,
      stream: true,
      messages: [{ role: "system", content: system }, ...messages],
      ...(p.kind === "openai" ? { max_completion_tokens: maxTokens } : { max_tokens: maxTokens }),
    }),
  }).catch(() => {
    throw new AIError("Could not reach your AI provider.", "upstream");
  });
  if (!res.ok || !res.body) await oaiError(res);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const delta = (JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        /* keep-alive comments and partial lines */
      }
    }
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
  language?: Language | null;
  /** Admin model test only: use exactly this model, with no fallback. */
  modelOverride?: { kind: "gemini" | "gateway"; model: string };
}): Promise<z.infer<S>> {
  const system = opts.system + languageInstruction(opts.language);
  const jsonSchema = toOutputSchema(z.toJSONSchema(opts.schema, { io: "input" })) as Record<string, unknown>;
  const effort = opts.effort ?? "medium";
  const maxTokens = opts.maxTokens ?? 16000;
  const call = async (p: Provider) => {
    const m: Meter = {};
    try {
      const text = await meterStore.run(m, () =>
        p.kind === "gemini"
          ? geminiStructured(p, system, opts.prompt, jsonSchema, effort, maxTokens)
          : p.kind === "openai" || p.kind === "openrouter"
            ? oaiStructured(p, system, opts.prompt, jsonSchema, maxTokens)
            : claudeStructured(p, system, opts.prompt, jsonSchema, effort, maxTokens),
      );
      await recordUsage(p, m, system.length + opts.prompt.length, (text ?? "").length, true);
      return text;
    } catch (err) {
      await recordUsage(p, m, system.length + opts.prompt.length, 0, false);
      throw err;
    }
  };
  if (opts.modelOverride) return parseAndValidate(await call({ kind: opts.modelOverride.kind, model: opts.modelOverride.model }), opts.schema);
  const p = await resolveProvider();
  let text: string;
  try {
    text = await call(p);
  } catch (err) {
    // A plan-tier model that fails falls back to the app default once.
    const def = appProvider();
    const fallback = !p.apiKey && (p.kind !== def.kind || p.model !== def.model) && !(err instanceof AIError && err.code === "refusal");
    if (!fallback) throw err;
    console.warn(`[ai] ${p.kind}/${p.model} failed (${(err as Error).message}); using the default model.`);
    text = await call(def);
  }
  return parseAndValidate(text, opts.schema);
}

/** Streams plain-text deltas (used by the AI Coach). */
export async function* streamText(opts: {
  system: string;
  messages: ChatMessage[];
  effort?: Effort;
  maxTokens?: number;
  language?: Language | null;
}): AsyncGenerator<string> {
  const p = await resolveProvider();
  const system = opts.system + languageInstruction(opts.language);
  const effort = opts.effort ?? "medium";
  const maxTokens = opts.maxTokens ?? 8000;
  const inChars = system.length + opts.messages.reduce((a, m) => a + m.content.length, 0);
  let outChars = 0;
  let ok = false;
  try {
    const gen =
      p.kind === "gemini"
        ? geminiText(p, system, opts.messages, effort, maxTokens)
        : p.kind === "openai" || p.kind === "openrouter"
          ? oaiText(p, system, opts.messages, maxTokens)
          : claudeText(p, system, opts.messages, effort, maxTokens);
    for await (const chunk of gen) {
      outChars += chunk.length;
      yield chunk;
    }
    ok = true;
  } finally {
    // Streams are metered from text length (close to the token count).
    await recordUsage(p, {}, inChars, outChars, ok);
  }
}
