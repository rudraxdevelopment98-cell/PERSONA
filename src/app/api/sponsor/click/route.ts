import { NextResponse } from "next/server";
import { clickSponsor } from "@/lib/server/sponsors";

export const dynamic = "force-dynamic";

/** Counts a click on a sponsored card, then sends the user to the sponsor's page. */
export async function GET(request: Request) {
  const u = new URL(request.url);
  const id = u.searchParams.get("c") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
  const url = await clickSponsor(id, u.searchParams.get("p") ?? "dashboard");
  if (!url) return new NextResponse("Not found", { status: 404 });
  return NextResponse.redirect(url, 302);
}
