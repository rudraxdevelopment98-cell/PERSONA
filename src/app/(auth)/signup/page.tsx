import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSessionUser } from "@/lib/db/server";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Create account" };
export const dynamic = "force-dynamic";

export default async function Page() {
  if (await getSessionUser().catch(() => null)) redirect("/dashboard");
  return (
    <Suspense>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
