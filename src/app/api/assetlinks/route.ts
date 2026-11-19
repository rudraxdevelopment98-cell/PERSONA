import { getPool } from "@/lib/db/pool";
import { ANDROID_PACKAGE, UPLOAD_KEY_SHA256, isFingerprint } from "@/lib/domain/android";

export const dynamic = "force-dynamic";

/** Served at /.well-known/assetlinks.json (see next.config rewrites). */
export async function GET() {
  let extra: string[] = [];
  try {
    const { rows } = await getPool().query<{ value: { fingerprints?: string[] } }>("select value from public.app_settings where key = 'android'");
    extra = (rows[0]?.value.fingerprints ?? []).filter(isFingerprint).map((f) => f.trim().toUpperCase());
  } catch {}
  const fingerprints = [...new Set([UPLOAD_KEY_SHA256, ...extra])];
  return Response.json(
    [{ relation: ["delegate_permission/common.handle_all_urls"], target: { namespace: "android_app", package_name: ANDROID_PACKAGE, sha256_cert_fingerprints: fingerprints } }],
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
