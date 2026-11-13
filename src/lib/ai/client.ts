import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { toOutputSchema } from "./output-schema";

export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

// Server-side refusal fallback: if a safety classifier declines, the API
// re-runs the request on a suitable fallback model inside the same call.
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5", "claude-fable-5-2", "claude-fable-5-1"]);
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

export class AIError extends Error {
  constructor(
    message: string,
    public readonly code: "not_configured" | "refusal" | "truncated" | "invalid_output" | "upstream",
  ) {
    super(message);
  }
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AIError("The AI service is not configured. Set ANTHROPIC_API_KEY on the server.", "not_configured");
  }
  client ??= new Anthropic({ maxRetries: 2 });
  return client;
}

type Effort = "low" | "medium" | "high";

function fallbackParams() {
  return FALLBACK_MODELS.has(AI_MODEL) ? { betas: [FALLBACK_BETA], fallbacks: "default" as const } : {};
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
  const anthropic = getClient();
  const jsonSchema = toOutputSchema(z.toJSONSchema(opts.schema, { io: "input" })) as Record<string, unknown>;

  try {
    const stream = anthropic.beta.messages.stream({
      model: AI_MODEL,
      max_tokens: opts.maxTokens ?? 16000,
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
      output_config: { effort: opts.effort ?? "medium", format: { type: "json_schema", schema: jsonSchema } },
      ...fallbackParams(),
    });
    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      throw new AIError("The AI declined to generate this content. Try rephrasing your input.", "refusal");
    }
    if (message.stop_reason === "max_tokens") {
      throw new AIError("The AI response was cut off. Please try again.", "truncated");
    }
    const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
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
  const anthropic = getClient();
  try {
    const stream = anthropic.beta.messages.stream({
      model: AI_MODEL,
      max_tokens: opts.maxTokens ?? 8000,
      system: opts.system,
      messages: opts.messages,
      output_config: { effort: opts.effort ?? "medium" },
      ...fallbackParams(),
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
