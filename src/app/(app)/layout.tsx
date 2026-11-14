import { AppNav } from "@/components/app-nav";
import { getGamification } from "@/lib/server/gamification";
import { getUserState } from "@/lib/server/state";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [{ state }, { stats, level }] = await Promise.all([getUserState(), getGamification()]);
  const name = state.profile.display_name || state.email?.split("@")[0] || "You";
  return (
    <div className="min-h-screen">
      <AppNav
        name={name}
        day={state.day}
        stats={{ level: level.level, levelName: level.name, progress: level.progress, toNext: level.toNext, xp: stats.xp, streak: stats.streak }}
      />
      <main className="lg:pl-64">
        <div className="pb-safe mx-auto max-w-5xl px-4 pt-6 sm:px-6 lg:pt-10">{children}</div>
      </main>
    </div>
  );
}
