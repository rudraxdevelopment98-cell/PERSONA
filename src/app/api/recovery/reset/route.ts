import { NextResponse } from "next/server";
import { z } from "zod";
import { RecoveryError, resetPasswordWithAnswers, resetPasswordWithCode } from "@/lib/server/recovery";

const base = {
  email: z.string().trim().email("Enter your account email.").max(254),
  password: z.string().min(10, "Use a password of at least 10 characters.").max(128),
};
const schema = z.union([
  z.object({ ...base, method: z.literal("code").default("code"), code: z.string().trim().min(8, "Enter one of your recovery codes.").max(40) }),
  z.object({ ...base, method: z.literal("questions"), answer1: z.string().trim().min(1, "Answer both questions.").max(200), answer2: z.string().trim().min(1, "Answer both questions.").max(200) }),
]);

/** Public endpoint: reset a forgotten password with a recovery code or the user's security questions. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
  const d = parsed.data;
  try {
    if (d.method === "questions") await resetPasswordWithAnswers(d.email, d.answer1, d.answer2, d.password, ip);
    else await resetPasswordWithCode(d.email, d.code, d.password, ip);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof RecoveryError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("Password reset failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
