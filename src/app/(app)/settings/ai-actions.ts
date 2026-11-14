"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/db/server";
import {
  ConnectionError,
  defaultModel,
  deleteConnection,
  getUserAI,
  listModels,
  saveConnection,
  type UserProvider,
} from "@/lib/server/ai-connection";

const providerSchema = z.enum(["openrouter", "anthropic", "gemini", "openai"]);

/** Validates the key with the provider, then stores it encrypted with a sensible default model. */
export async function connectWithKey(provider: string, apiKey: string): Promise<{ error?: string; models?: string[]; model?: string }> {
  const p = providerSchema.safeParse(provider);
  const key = apiKey.trim();
  if (!p.success) return { error: "Choose a provider." };
  if (key.length < 10 || key.length > 500 || /\s/.test(key)) return { error: "That doesn't look like a valid API key." };
  const { db, user } = await requireUser();
  try {
    const models = await listModels(p.data, key);
    if (models.length === 0) return { error: "This key works, but no suitable text models are available on it." };
    const model = defaultModel(p.data, models);
    await saveConnection(db, user.id, { provider: p.data, apiKey: key, model, connectedVia: "key" });
    revalidatePath("/settings");
    return { models, model };
  } catch (err) {
    return { error: err instanceof ConnectionError ? err.message : "Could not save the connection." };
  }
}

/** Models available on the user's connected key (for the model picker). */
export async function listMyModels(): Promise<{ models: string[]; error?: string }> {
  const { db, user } = await requireUser();
  const ai = await getUserAI(db, user.id);
  if (!ai) return { models: [] };
  try {
    return { models: await listModels(ai.provider as UserProvider, ai.apiKey) };
  } catch (err) {
    return { models: [], error: err instanceof ConnectionError ? err.message : "Could not load models." };
  }
}

export async function setMyModel(model: string): Promise<{ error?: string }> {
  const m = z.string().trim().min(1).max(200).regex(/^[\w.:\/-]+$/).safeParse(model);
  if (!m.success) return { error: "Invalid model." };
  const { db, user } = await requireUser();
  const { error } = await db.from("ai_connections").update({ model: m.data }).eq("user_id", user.id);
  if (error) return { error: "Could not save the model." };
  revalidatePath("/settings");
  return {};
}

export async function disconnectAI(): Promise<{ error?: string }> {
  const { db, user } = await requireUser();
  await deleteConnection(db, user.id);
  revalidatePath("/settings");
  return {};
}
