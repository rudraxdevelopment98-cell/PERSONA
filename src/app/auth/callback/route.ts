import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Exchanges the email-confirmation code for a session. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/assessment", url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=Your+link+is+invalid+or+has+expired.", url.origin));
}
