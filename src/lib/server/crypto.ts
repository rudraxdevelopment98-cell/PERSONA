import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * AES-256-GCM encryption for user API keys. The key is derived from
 * AI_KEYS_SECRET, or else from the auth secret / database URL - all server-only.
 */
function encryptionKey(): Buffer {
  const material = process.env.AI_KEYS_SECRET || process.env.BETTER_AUTH_SECRET || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!material) throw new Error("No server secret available to encrypt API keys.");
  return createHash("sha256").update(`persona90-ai-keys:${material}`).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${data.toString("base64url")}`;
}

export function decryptSecret(token: string): string {
  const [version, iv, tag, data] = token.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Unrecognised encrypted value.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

export function keyHint(key: string): string {
  return `…${key.slice(-4)}`;
}
