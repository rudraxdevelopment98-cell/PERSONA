import { cookies } from "next/headers";
import { dbForUser, getSessionUser } from "@/lib/db/server";
import { ConnectionError, defaultModel, listModels, PROVIDER_BASE, saveConnection } from "@/lib/server/ai-connection";

const PKCE_COOKIE = "or_pkce";

/** OpenRouter redirects back here with a one-time code, exchanged (with the PKCE verifier) for the user's key. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  // Relative redirects keep the user on the host they came from.
  const go = (path: string) => new Response(null, { status: 303, headers: { Location: path } });
  const done = (query: string) => go(`/settings/ai?${query}#your-ai`);

  const user = await getSessionUser();
  if (!user) return go("/login");

  const jar = await cookies();
  const stored = jar.get(PKCE_COOKIE)?.value ?? "";
  jar.delete({ name: PKCE_COOKIE, path: "/api/ai/openrouter" });
  const [cookieUser, verifier] = stored.split(".");
  const code = url.searchParams.get("code");
  if (!code || !verifier || cookieUser !== user.id) return done("ai_error=The+connection+expired.+Please+try+again.");

  try {
    const res = await fetch(`${PROVIDER_BASE.openrouter}/auth/keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: "S256" }),
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await res.json().catch(() => ({}))) as { key?: string };
    if (!res.ok || !data.key) return done("ai_error=OpenRouter+did+not+approve+the+connection.");

    const models = await listModels("openrouter", data.key);
    await saveConnection(dbForUser(user.id), user.id, {
      provider: "openrouter",
      apiKey: data.key,
      model: defaultModel("openrouter", models),
      connectedVia: "oauth",
    });
    return done("ai=connected");
  } catch (err) {
    const msg = err instanceof ConnectionError ? err.message : "Could not finish connecting OpenRouter.";
    return done(`ai_error=${encodeURIComponent(msg)}`);
  }
}
