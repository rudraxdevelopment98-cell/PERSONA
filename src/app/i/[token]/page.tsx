import type { Metadata } from "next";
import { Users } from "lucide-react";
import { Logo } from "@/components/logo";
import { Alert, ButtonLink, Card } from "@/components/ui";
import { getSessionUser } from "@/lib/db/server";
import { inviteInfo, type InviteInfo } from "@/lib/server/social";
import { InviteActions } from "./invite-actions";

export const dynamic = "force-dynamic";
// Invite links must not leak into search results or referrers.
export const metadata: Metadata = { title: "You're invited", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = /^[A-Za-z0-9_-]{10,64}$/.test(token);
  const [info, user] = await Promise.all([valid ? inviteInfo(token) : Promise.resolve<InviteInfo>({ valid: false, reason: "This invite link isn't valid." }), getSessionUser()]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>
        <Card className="p-6 text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-accent-soft text-3xl">
            {info.valid && info.kind === "circle" ? (info.circleEmoji ?? "👥") : <Users className="size-8 text-accent" />}
          </span>
          {info.valid ? (
            <>
              <h1 className="mt-4 text-xl font-extrabold">
                {info.kind === "circle" ? `${info.inviterName} invited you to join ${info.circleName}` : `${info.inviterName} invited you to grow together`}
              </h1>
              <p className="mt-2 text-sm text-muted">
                PERSONA 90 is a free 90-day programme for confidence, communication and decision-making. Friends cheer each other on and race - and only see what you choose to share.
              </p>
              <div className="mt-6">
                <InviteActions token={token} signedIn={Boolean(user)} />
              </div>
            </>
          ) : (
            <>
              <h1 className="mt-4 text-xl font-extrabold">Invite unavailable</h1>
              <div className="mt-3">
                <Alert tone="warning">{info.reason}</Alert>
              </div>
              <ButtonLink href={user ? "/friends" : "/signup"} className="mt-5">
                {user ? "Go to Friends" : "Create a free account"}
              </ButtonLink>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
