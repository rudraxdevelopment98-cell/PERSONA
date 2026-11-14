import { NextResponse } from "next/server";
import { z } from "zod";
import { questionsForEmail } from "@/lib/server/recovery";

/** Public: the security questions for an email (stable decoys for unknown emails). */
export async function POST(request: Request) {
  const parsed = z.object({ email: z.string().trim().email().max(254) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your account email." }, { status: 400 });
  return NextResponse.json(await questionsForEmail(parsed.data.email));
}
