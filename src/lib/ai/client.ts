import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { toOutputSchema } from "./output-schema";

/**
 * Provider selection (no code changes needed between environments):
 *  1. ANTHROPIC_API_KEY set      -> Claude API directly.
 *  2. Otherwise, on Vercel        -> Vercel AI Gateway, authenticated automatically
 *                                    with the deployment's OIDC token (no API key).
 *     AI_GATEWAY_API_KEY may be set instead to use the gateway from elsewhere.
 */
type Provider = { kind: "anthropic" | "gateway"; model: string };

function provider(): Provider {
  if (process.env.ANTHROPIC_API_KEY) return { kind: "anthropic", model: process.env.AI_MODEL || "claude-opus-5-5" };
  return { kind: "gateway", model: process.env.AI_MODEL || "anthropic/claude-opus-5.5" };
}

export const AI_MODEL = provider().model;

// Server-side refusal fallback (Claude API only): if a safety classifier
// declines, the API re-runs the request on a suitable fallback model.
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5", "claude-fable-5-2", "claude-fable-5-1"]);
const FALLBACK_BETA = "server-side-fallback-2026-07-01";
const GATEWAY_URL = process.env.AI_GATEWAY_URL || "https://ai-gateway.vercel.sh";

export class AIError extends Error {
  constructor(
    message: string,
    public readonly code: "not_configured" | "refusal" | "truncated" | "invalid_output" | "upstream",
  ) {
    super(message);
  }
}

let directClient: Anthropic | null = null;

async function getClient(): Promise<{ anthropic: Anthropic; p: Provider }> {
  const p = provider();
  if (p.kind === "anthropic") {
    directClient ??= new Anthropic({ maxRetries: 2 });
    return { anthropic: directClient, p };
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
    throw new AIError("The AI service is not configured. Deploy on Vercel (AI Gateway) or set ANTHROPIC_API_KEY.", "not_configured");
  }
  // OIDC tokens are short-lived, so build a client per request.
  return { anthropic: new Anthropic({ apiKey: token, baseURL: GATEWAY_URL, maxRetries: 2 }), p };
}

type Effort = "low" | "medium" | "high";
type StreamParams = Parameters<Anthropic["messages"]["stream"]>[0];

/** Opens a stream; uses the beta endpoint only when the refusal-fallback beta applies. */
function openStream(anthropic: Anthropic, p: Provider, params: StreamParams) {
  if (p.kind === "anthropic" && FALLBACK_MODELS.has(p.model)) {
    return anthropic.beta.messages.stream({ ...(params as object), betas: [FALLBACK_BETA], fallbacks: "default" } as Parameters<Anthropic["beta"]["messages"]["stream"]>[0]);
  }
  return anthropic.messages.stream(params);
}

function mapUpstreamError(err: unknown): never {
  if (err instanceof AIError) throw err;
  if (err instanceof Anthropic.RateLimitError) throw new AIError("The AI service is busy. Please try again in a minute.", "upstream");
  if (err instanceof Anthropic.AuthenticationError) throw new AIError("The AI service rejected the server's API key.", "not_configured");
  if (err instanceof Anthropic.APIError) throw new AIError(`The AI service returned an error (${err.status ?? "network"}).`, "upstream");
  throw err;
}

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
  const { anthropic, p } = await getClient();
  const jsonSchema = toOutputSchema(z.toJSONSchema(opts.schema, { io: "input" })) as Record<string, unknown>;

  try {
    const stream = openStream(anthropic, p, {
      model: p.model,
      max_tokens: opts.maxTokens ?? 16000,
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
      output_config: { effort: opts.effort ?? "medium", format: { type: "json_schema", schema: jsonSchema } },
    });
    const message = (await stream.finalMessage()) as { stop_reason: string | null; content: { type: string; text?: string }[] };

    if (message.stop_reason === "refusal") {
      throw new AIError("The AI declined to generate this content. Try rephrasing your input.", "refusal");
    }
    if (message.stop_reason === "max_tokens") {
      throw new AIError("The AI response was cut off. Please try again.", "truncated");
    }
    const text = message.content.flatMap((b) => (b.type === "text" && b.text ? [b.text] : [])).join("");
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new AIError("The AI returned malformed output. Please try again.", "invalid_output");
    }
    const parsed = opts.schema.safeParse(raw);
    if (!parsed.success) {
      throw new AIError("The AI returned output in an unexpected shape. Please try again.", "invalid_output");
    }
    return parsed.data;
  } catch (err) {
    mapUpstreamError(err);
  }
}

/** Streams plain-text deltas (used by the AI Coach). */
export async function* streamText(opts: {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  effort?: Effort;
  maxTokens?: number;
}): AsyncGenerator<string> {
  const { anthropic, p } = await getClient();
  try {
    const stream = openStream(anthropic, p, {
      model: p.model,
      max_tokens: opts.maxTokens ?? 8000,
      system: opts.system,
      messages: opts.messages,
      output_config: { effort: opts.effort ?? "medium" },
    });
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") {
      yield "\n\nI can't help with that particular request. If you are going through something difficult, please consider speaking with a qualified professional or someone you trust.";
    }
  } catch (err) {
    mapUpstreamError(err);
  }
}
