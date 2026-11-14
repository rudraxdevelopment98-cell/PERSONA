import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/db/server";
import { requestOrigin } from "@/lib/server/origin";

const PKCE_COOKIE = "or_pkce";

/** Starts "Connect with OpenRouter" (OAuth PKCE): the user signs in on OpenRouter and approves a key for this app. */
export async function GET() {
  const user = await getSessionUser();
  const origin = await requestOrigin();
  if (!user) return new Response(null, { status: 303, headers: { Location: "/login" } });

  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  (await cookies()).set(PKCE_COOKIE, `${user.id}.${verifier}`, {
    httpOnly: true,
    secure: origin.startsWith("https://"),
    sameSite: "lax",
    path: "/api/ai/openrouter",
    maxAge: 600,
  });

  const auth = new URL(process.env.USER_OPENROUTER_AUTH_URL || "https://openrouter.ai/auth");
  auth.searchParams.set("callback_url", `${origin}/api/ai/openrouter/callback`);
  auth.searchParams.set("code_challenge", challenge);
  auth.searchParams.set("code_challenge_method", "S256");
  return NextResponse.redirect(auth.toString());
}
