import Link from "next/link";
import { ShareProgress } from "@/components/share-progress";
import { InstallApp } from "@/components/install-app";
import { BookOpen, ChevronRight, ClipboardList, Fingerprint, Gem, LineChart, LogOut, Map, NotebookPen, Settings, ShieldCheck, Trophy } from "lucide-react";
import { isAdmin } from "@/lib/server/admin";
import { Card, IconTile, ProgressBar } from "@/components/ui";
import { getGamification } from "@/lib/server/gamification";
import { getUserState } from "@/lib/server/state";
import { getProfileCard } from "@/lib/server/moments";
import { FaceAvatar } from "@/components/moments";
import { coverBg } from "@/lib/domain/moments";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Me" };

const LINKS = [
  { href: "/me/persona", label: "My persona (private)", icon: Fingerprint, tone: "primary" as const },
  { href: "/progress", label: "Progress", icon: LineChart, tone: "accent" as const },
  { href: "/achievements", label: "Achievements", icon: Trophy, tone: "sun" as const },
  { href: "/journal", label: "Journal", icon: NotebookPen, tone: "sky" as const },
  { href: "/programme", label: "90-day plan", icon: Map, tone: "primary" as const },
  { href: "/assessment", label: "Assessment & profile", icon: ClipboardList, tone: "coral" as const },
  { href: "/guide", label: "Guide: how it works", icon: BookOpen, tone: "accent" as const },
  { href: "/settings", label: "Settings", icon: Settings, tone: "neutral" as const },
  { href: "/pricing", label: "Plan & Pro", icon: Gem, tone: "sun" as const },
];

export default async function MePage() {
  const t = await getT();
  const [{ state, user }, { stats, level }] = await Promise.all([getUserState(), getGamification()]);
  const links = (await isAdmin(user.id).catch(() => false)) ? [...LINKS, { href: "/admin", label: "Admin", icon: ShieldCheck, tone: "primary" as const }] : LINKS;
  const name = state.profile.display_name || state.email?.split("@")[0] || "You";
  const card = await getProfileCard(user.id);
  return (
    <>
      <Card className="mb-5 overflow-hidden">
        <div className="h-16" style={{ background: coverBg(card.cover) }} />
        <div className="p-5 pt-0">
          <div className="flex items-end gap-4">
            <Link href="/friends/profile" aria-label={t("Edit profile card")} className="-mt-8 shrink-0 rounded-full bg-surface p-1">
              <FaceAvatar name={name} emoji={card.avatar_emoji} cover={card.cover} size="lg" />
            </Link>
            <div className="min-w-0 pt-2">
              <p className="truncate text-xl font-extrabold">{name}</p>
              <p className="text-sm text-muted">{t("Level {0} · {1}", level.level, t(level.name))}</p>
            </div>
            <Link href="/friends/profile" className="mb-1 ml-auto shrink-0 text-xs font-semibold text-primary">{t("Edit")}</Link>
          </div>
          {card.bio && <p className="mt-3 text-sm">{card.bio}</p>}
          <div className="mt-5 grid grid-cols-3 text-center">
            {[
              { v: stats.xp, l: "XP" },
              { v: stats.streak, l: "Day streak" },
              { v: stats.sessionsCompleted, l: "Sessions" },
            ].map((s) => (
              <div key={s.l}>
                <p className="text-xl font-extrabold tabular-nums">{s.v}</p>
                <p className="text-xs text-muted">{t(s.l)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="px-5 pb-1">
          <ShareProgress />
        </div>
        <div className="px-5 py-3">
          <div className="mb-1 flex justify-between text-xs text-muted">
            <span>{t("Level {0}", level.level)}</span>
            <span>{level.toNext}{" "}{t("XP to level")}{" "}{level.level + 1}</span>
          </div>
          <ProgressBar value={level.progress} tone="accent" />
        </div>
      </Card>
      <Card className="divide-y divide-line">
        <InstallApp variant="row" />
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="flex items-center gap-3 px-4 py-3 hover:bg-bg">
            <IconTile tone={l.tone} size="sm">
              <l.icon className="size-4" />
            </IconTile>
            <span className="flex-1 text-sm font-semibold">{t(l.label)}</span>
            <ChevronRight className="size-4 text-muted" />
          </Link>
        ))}
        <form action="/auth/signout" method="post">
          <button className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-bg">
            <IconTile tone="neutral" size="sm">
              <LogOut className="size-4" />
            </IconTile>
            <span className="text-sm font-semibold text-danger">{t("Sign out")}</span>
          </button>
        </form>
      </Card>
    </>
  );
}
