import { cookies } from "next/headers";
import { AppNav } from "@/components/app-nav";
import { getGamification } from "@/lib/server/gamification";
import { inviteInfo, unreadCount } from "@/lib/server/social";
import { getUserState } from "@/lib/server/state";
import { InviteBanner } from "./invite-banner";

export const dynamic = "force-dynamic";

async function pendingInvite() {
  const token = (await cookies()).get("p90_invite")?.value;
  if (!token || !/^[A-Za-z0-9_-]{10,64}$/.test(token)) return null;
  const info = await inviteInfo(token).catch(() => null);
  return info?.valid ? { token, info } : null;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [{ state, user }, { stats, level }] = await Promise.all([getUserState(), getGamification()]);
  const [unread, invite] = await Promise.all([unreadCount(user.id).catch(() => 0), pendingInvite()]);
  const name = state.profile.display_name || "You";
  return (
    <div className="min-h-screen">
      <AppNav
        name={name}
        day={state.day}
        unread={unread}
        stats={{ level: level.level, levelName: level.name, progress: level.progress, toNext: level.toNext, xp: stats.xp, streak: stats.streak }}
      />
      <main className="lg:pl-64">
        <div className="pb-safe mx-auto max-w-5xl px-4 pt-6 sm:px-6 lg:pt-10">
          {invite && (
            <InviteBanner
              token={invite.token}
              text={invite.info.kind === "circle" ? `${invite.info.inviterName} invited you to join ${invite.info.circleName}` : `${invite.info.inviterName} invited you to be friends`}
            />
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
