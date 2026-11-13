import "server-only";
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
 * Email + password authentication. Users, sessions and hashed passwords live
 * in the Better Auth tables, which the restricted app_user role cannot read.
 */
export const auth = betterAuth({
  database: getPool(),
  // The secret is only needed at runtime; a placeholder keeps `next build` working without it.
  secret: process.env.BETTER_AUTH_SECRET || (isBuild ? "build-time-placeholder-secret-not-used-at-runtime" : undefined),
  baseURL,
  trustedOrigins: [...vercelUrls, ...(process.env.NEXT_PUBLIC_SITE_URL ? [process.env.NEXT_PUBLIC_SITE_URL] : [])],
  emailAndPassword: { enabled: true, minPasswordLength: 10, maxPasswordLength: 128, autoSignIn: true },
  session: { expiresIn: 60 * 60 * 24 * 14, updateAge: 60 * 60 * 24 },
  rateLimit: { enabled: true, storage: "database", window: 60, max: 60 },
  advanced: { database: { generateId: () => crypto.randomUUID() } },
  plugins: [nextCookies()],
});
