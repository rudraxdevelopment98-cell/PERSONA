import "server-only";
import { createHash } from "node:crypto";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { getPool } from "@/lib/db/pool";

const vercelUrls = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]
  .filter(Boolean)
  .map((h) => `https://${h}`);

const baseURL =
  process.env.BETTER_AUTH_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined) ||
  process.env.NEXT_PUBLIC_SITE_URL;

const isBuild = process.env.NEXT_PHASE === "phase-production-build";

/**
 * Session-signing secret. Prefer BETTER_AUTH_SECRET; otherwise derive one from
 * the database connection string (which embeds the database password and only
 * exists on the server), so a fresh Vercel + Neon deploy works without extra
 * configuration. Rotating the database password then signs everyone out.
 */
function authSecret(): string | undefined {
  if (process.env.BETTER_AUTH_SECRET) return process.env.BETTER_AUTH_SECRET;
  const dbUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (dbUrl) return createHash("sha256").update(`persona90-auth-secret:${dbUrl}`).digest("hex");
  return isBuild ? "build-time-placeholder-secret-not-used-at-runtime" : undefined;
}

/**
 * Email + password authentication. Users, sessions and hashed passwords live
 * in the Better Auth tables, which the restricted app_user role cannot read.
 */
export const auth = betterAuth({
  database: getPool(),
  secret: authSecret(),
  baseURL,
  trustedOrigins: [...vercelUrls, ...(process.env.NEXT_PUBLIC_SITE_URL ? [process.env.NEXT_PUBLIC_SITE_URL] : [])],
  emailAndPassword: { enabled: true, minPasswordLength: 10, maxPasswordLength: 128, autoSignIn: true },
  session: { expiresIn: 60 * 60 * 24 * 14, updateAge: 60 * 60 * 24 },
  rateLimit: { enabled: true, storage: "database", window: 60, max: 60 },
  advanced: { database: { generateId: () => crypto.randomUUID() } },
  plugins: [nextCookies()],
});
