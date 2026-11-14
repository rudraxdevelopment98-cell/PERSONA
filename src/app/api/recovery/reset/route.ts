import { NextResponse } from "next/server";
import { z } from "zod";
import { RecoveryError, resetPasswordWithCode } from "@/lib/server/recovery";

const schema = z.object({
  email: z.string().trim().email("Enter your account email.").max(254),
  code: z.string().trim().min(8, "Enter one of your recovery codes.").max(40),
  password: z.string().min(10, "Use a password of at least 10 characters.").max(128),
});

/** Public endpoint: reset a forgotten password with a one-time recovery code. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
  try {
    await resetPasswordWithCode(parsed.data.email, parsed.data.code, parsed.data.password, ip);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof RecoveryError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("Password reset failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
