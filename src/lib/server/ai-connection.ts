import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Db } from "@/lib/db/server";
import { decryptSecret, encryptSecret, keyHint } from "./crypto";

export type UserProvider = "openrouter" | "anthropic" | "gemini" | "openai";

export const PROVIDER_LABELS: Record<UserProvider, string> = {
  openrouter: "OpenRouter",
  anthropic: "Claude (Anthropic)",
  gemini: "Google Gemini",
  openai: "OpenAI",
};

export const PROVIDER_BASE: Record<"openai" | "openrouter", string> = {
  openai: process.env.USER_OPENAI_BASE_URL || "https://api.openai.com/v1",
  openrouter: process.env.USER_OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
};

/** A user's provider with the decrypted key - server-only, never sent to the browser. */
export type UserAI = { provider: UserProvider; model: string; apiKey: string };

/** What the browser may see about a connection. */
export type ConnectionSummary = { provider: UserProvider; model: string; keyHint: string; connectedVia: "key" | "oauth" } | null;

export class ConnectionError extends Error {}

const MAX_MODELS = 80;

async function fetchJSON(url: string, init: RequestInit): Promise<{ status: number; body: unknown }> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

/** Checks the key works and returns the models it can use (newest/most relevant first). */
export async function listModels(provider: UserProvider, apiKey: string): Promise<string[]> {
  try {
    if (provider === "anthropic") {
      const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 15_000 });
      const ids: string[] = [];
      for await (const m of client.models.list({ limit: 100 })) ids.push(m.id);
      return ids.slice(0, MAX_MODELS);
    }
    if (provider === "gemini") {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { apiVersion: "v1beta", ...(process.env.GEMINI_BASE_URL ? { baseUrl: process.env.GEMINI_BASE_URL } : {}) },
      });
      const ids: string[] = [];
      const pager = await ai.models.list({ config: { pageSize: 100 } });
      for await (const m of pager) {
        const name = (m.name ?? "").replace(/^models\//, "");
        const actions = (m as { supportedActions?: string[] }).supportedActions ?? [];
        if (name.startsWith("gemini") && (actions.length === 0 || actions.includes("generateContent")) && !/image|tts|embedding|audio|live/.test(name)) ids.push(name);
      }
      return ids.slice(0, MAX_MODELS);
    }
    if (provider === "openai") {
      const { status, body } = await fetchJSON(`${PROVIDER_BASE.openai}/models`, { headers: { Authorization: `Bearer ${apiKey}` } });
      if (status === 401 || status === 403) throw new ConnectionError("The API key was not accepted.");
      if (status >= 400) throw new ConnectionError(`The provider returned an error (${status}).`);
      const ids = ((body as { data?: { id: string }[] })?.data ?? [])
        .map((m) => m.id)
        .filter((id) => /^(gpt|o\d|chatgpt)/.test(id) && !/audio|realtime|tts|transcribe|search|image|instruct/.test(id))
        .sort()
        .reverse();
      return ids.slice(0, MAX_MODELS);
    }
    // OpenRouter: validate the key, then list text models that support structured output.
    const key = await fetchJSON(`${PROVIDER_BASE.openrouter}/key`, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (key.status === 401 || key.status === 403) throw new ConnectionError("The OpenRouter key was not accepted.");
    if (key.status >= 400) throw new ConnectionError(`OpenRouter returned an error (${key.status}).`);
    const { body } = await fetchJSON(`${PROVIDER_BASE.openrouter}/models`, {});
    const models = ((body as { data?: { id: string; supported_parameters?: string[] }[] })?.data ?? []).filter(
      (m) => !m.id.endsWith(":batch") && (m.supported_parameters ?? []).includes("response_format"),
    );
    const preferred = ["anthropic/", "google/", "openai/", "meta-llama/", "mistralai/", "deepseek/", "qwen/"];
    const rank = (id: string) => {
      const i = preferred.findIndex((p) => id.startsWith(p));
      return i === -1 ? preferred.length : i;
    };
    return models
      .map((m) => m.id)
      .sort((a, b) => rank(a) - rank(b))
      .slice(0, MAX_MODELS);
  } catch (err) {
    if (err instanceof ConnectionError) throw err;
    const status = (err as { status?: number })?.status;
    if (status === 401 || status === 403 || status === 400) throw new ConnectionError("The API key was not accepted.");
    throw new ConnectionError("Could not reach the provider to check the key. Please try again.");
  }
}

/** Sensible default: a fast, inexpensive model from the list. */
export function defaultModel(provider: UserProvider, models: string[]): string {
  const find = (re: RegExp) => models.find((m) => re.test(m));
  switch (provider) {
    case "anthropic":
      return find(/haiku/) ?? models[0];
    case "gemini":
      return find(/^gemini-[\d.]+-flash$/) ?? find(/flash/) ?? models[0];
    case "openai":
      return find(/mini/) ?? models[0];
    case "openrouter":
      return find(/^anthropic\/claude-haiku/) ?? find(/^google\/gemini.*flash/) ?? models[0];
  }
}

export async function getConnectionSummary(db: Db, userId: string): Promise<ConnectionSummary> {
  const { data } = await db.from("ai_connections").select("provider, model, key_hint, connected_via").eq("user_id", userId).maybeSingle();
  return data ? { provider: data.provider, model: data.model, keyHint: data.key_hint, connectedVia: data.connected_via } : null;
}

/** The user's own provider, decrypted, or null to use the app's default. */
export async function getUserAI(db: Db, userId: string): Promise<UserAI | null> {
  const { data } = await db.from("ai_connections").select("provider, model, encrypted_key").eq("user_id", userId).maybeSingle();
  if (!data) return null;
  try {
    return { provider: data.provider, model: data.model, apiKey: decryptSecret(data.encrypted_key) };
  } catch {
    console.error("[ai] Could not decrypt a stored API key; falling back to the default provider.");
    return null;
  }
}

export async function saveConnection(db: Db, userId: string, c: { provider: UserProvider; apiKey: string; model: string; connectedVia: "key" | "oauth" }) {
  const { error } = await db.from("ai_connections").upsert(
    {
      user_id: userId,
      provider: c.provider,
      model: c.model,
      encrypted_key: encryptSecret(c.apiKey),
      key_hint: keyHint(c.apiKey),
      connected_via: c.connectedVia,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error("Could not save the AI connection.");
}

export async function deleteConnection(db: Db, userId: string) {
  await db.from("ai_connections").delete().eq("user_id", userId);
}
