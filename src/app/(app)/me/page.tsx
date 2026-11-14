import Link from "next/link";
import { ChevronRight, ClipboardList, LineChart, LogOut, Map, NotebookPen, Settings, Trophy } from "lucide-react";
import { Card, IconTile, ProgressBar } from "@/components/ui";
import { getGamification } from "@/lib/server/gamification";
import { getUserState } from "@/lib/server/state";

export const metadata = { title: "Me" };

const LINKS = [
  { href: "/progress", label: "Progress", icon: LineChart, tone: "accent" as const },
  { href: "/achievements", label: "Achievements", icon: Trophy, tone: "sun" as const },
  { href: "/journal", label: "Journal", icon: NotebookPen, tone: "sky" as const },
  { href: "/programme", label: "90-day plan", icon: Map, tone: "primary" as const },
  { href: "/assessment", label: "Assessment & profile", icon: ClipboardList, tone: "coral" as const },
  { href: "/settings", label: "Settings", icon: Settings, tone: "neutral" as const },
];

export default async function MePage() {
  const [{ state }, { stats, level }] = await Promise.all([getUserState(), getGamification()]);
  const name = state.profile.display_name || state.email?.split("@")[0] || "You";
  return (
    <>
      <Card className="mb-5 overflow-hidden">
        <div className="bg-primary p-5 text-white">
          <div className="flex items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-white/10 text-2xl font-extrabold">{name.slice(0, 1).toUpperCase()}</span>
            <div>
              <p className="text-lg font-extrabold">{name}</p>
              <p className="text-sm text-white/70">
                Level {level.level} · {level.name}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { v: stats.xp, l: "XP" },
              { v: stats.streak, l: "Day streak" },
              { v: stats.sessionsCompleted, l: "Sessions" },
            ].map((s) => (
              <div key={s.l} className="rounded-xl bg-white/10 py-2">
                <p className="text-lg font-extrabold tabular-nums">{s.v}</p>
                <p className="text-[11px] text-white/70">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="px-5 py-3">
          <div className="mb-1 flex justify-between text-xs text-muted">
            <span>Level {level.level}</span>
            <span>{level.toNext} XP to level {level.level + 1}</span>
          </div>
          <ProgressBar value={level.progress} tone="accent" />
        </div>
      </Card>
      <Card className="divide-y divide-line">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="flex items-center gap-3 px-4 py-3 hover:bg-bg">
            <IconTile tone={l.tone} size="sm">
              <l.icon className="size-4" />
            </IconTile>
            <span className="flex-1 text-sm font-semibold">{l.label}</span>
            <ChevronRight className="size-4 text-muted" />
          </Link>
        ))}
        <form action="/auth/signout" method="post">
          <button className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-bg">
            <IconTile tone="danger" size="sm">
              <LogOut className="size-4" />
            </IconTile>
            <span className="text-sm font-semibold text-danger">Sign out</span>
          </button>
        </form>
      </Card>
    </>
  );
}
