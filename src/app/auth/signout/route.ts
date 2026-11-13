import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function POST() {
  await auth.api.signOut({ headers: await headers() }).catch(() => {});
  // Relative redirect keeps the user on the same host they signed out from.
  return new Response(null, { status: 303, headers: { Location: "/login" } });
}
