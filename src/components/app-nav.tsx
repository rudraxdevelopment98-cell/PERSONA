"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpenCheck,
  ClipboardList,
  Dumbbell,
  Flame,
  GitBranch,
  Home,
  LineChart,
  LogOut,
  Map,
  MessageCircle,
  MessagesSquare,
  NotebookPen,
  Settings,
  ShieldCheck,
  Trophy,
  UserRound,
  Users,
  UsersRound,
} from "lucide-react";
import { Logo } from "./logo";
import { LanguageMenu } from "./language-menu";
import type { Language } from "@/lib/ai/prompts";
import { ProgressRing, cx } from "./ui";

export type NavStats = { level: number; levelName: string; progress: number; toNext: number; xp: number; streak: number };

const GROUPS = [
  {
    label: "Today",
    items: [
      { href: "/dashboard", label: "Home", icon: Home },
      { href: "/today", label: "Daily session", icon: BookOpenCheck },
    ],
  },
  {
    label: "Practice",
    items: [
      { href: "/decision-lab", label: "Decision Lab", icon: GitBranch },
      { href: "/communication-lab", label: "Communication Lab", icon: MessagesSquare },
      { href: "/coach", label: "AI Coach", icon: MessageCircle },
    ],
  },
  {
    label: "Together",
    items: [
      { href: "/friends", label: "Friends", icon: Users },
      { href: "/circles", label: "Circles", icon: UsersRound },
      { href: "/inbox", label: "Inbox", icon: Bell },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/progress", label: "Progress", icon: LineChart },
      { href: "/achievements", label: "Achievements", icon: Trophy },
      { href: "/journal", label: "Journal", icon: NotebookPen },
      { href: "/programme", label: "90-day plan", icon: Map },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/assessment", label: "Assessment", icon: ClipboardList },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const TABS = [
  { href: "/dashboard", label: "Home", icon: Home, match: ["/dashboard"] },
  { href: "/today", label: "Today", icon: BookOpenCheck, match: ["/today"] },
  { href: "/practice", label: "Practice", icon: Dumbbell, match: ["/practice", "/decision-lab", "/communication-lab", "/coach"] },
  { href: "/friends", label: "Friends", icon: Users, match: ["/friends", "/circles", "/races", "/inbox"] },
  { href: "/me", label: "Me", icon: UserRound, match: ["/me", "/progress", "/achievements", "/journal", "/programme", "/assessment", "/settings"] },
];

const isActive = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

function LevelCard({ stats, name, day }: { stats: NavStats; name: string; day: number }) {
  return (
    <Link href="/achievements" className="block rounded-2xl bg-primary p-4 text-white shadow-raised transition hover:brightness-110">
      <div className="flex items-center gap-3">
        <ProgressRing value={stats.progress} size={52} stroke={5} color="#2dd4bf" track="rgba(255,255,255,0.15)" label={`Level ${stats.level}`}>
          <span className="text-base font-extrabold">{stats.level}</span>
        </ProgressRing>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{name}</p>
          <p className="text-xs text-white/70">{stats.levelName}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
          <Flame className="size-3.5" /> {stats.streak} day{stats.streak === 1 ? "" : "s"}
        </span>
        <span className="text-white/70">{day > 0 ? `Day ${day}/90` : "Not started"}</span>
      </div>
      <p className="mt-1 text-[11px] text-white/60">{stats.toNext} XP to level {stats.level + 1}</p>
    </Link>
  );
}

export function AppNav({
  name,
  day,
  stats,
  unread = 0,
  language = "en",
  adminReports = null,
}: {
  name: string;
  day: number;
  stats: NavStats;
  unread?: number;
  language?: Language;
  /** Open report count for admins; null for everyone else. */
  adminReports?: number | null;
}) {
  const path = usePathname();
  const groups =
    adminReports == null
      ? GROUPS
      : GROUPS.map((g) => (g.label === "Account" ? { ...g, items: [...g.items, { href: "/admin", label: "Admin", icon: ShieldCheck }] } : g));

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
        <Link href="/dashboard" className="mb-5 px-2">
          <Logo />
        </Link>
        <LevelCard stats={stats} name={name} day={day} />
        <nav className="mt-5 flex-1 space-y-5 overflow-y-auto">
          {groups.map((g) => (
            <div key={g.label}>
              <p className="mb-1.5 px-2.5 text-[11px] font-bold uppercase tracking-wider text-muted/80">{g.label}</p>
              <div className="space-y-0.5">
                {g.items.map((item) => {
                  const active = isActive(path, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors",
                        active ? "bg-primary-soft font-semibold text-primary" : "text-muted hover:bg-bg hover:text-ink",
                      )}
                    >
                      <item.icon className="size-[18px] shrink-0" strokeWidth={active ? 2.25 : 1.75} />
                      {item.label}
                      {item.href === "/admin" && (adminReports ?? 0) > 0 && (
                        <span className="ml-auto rounded-full bg-danger px-1.5 text-[11px] font-bold text-white">{adminReports}</span>
                      )}
                      {item.href === "/inbox" && unread > 0 && (
                        <span className="ml-auto rounded-full bg-coral px-1.5 text-[11px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <form action="/auth/signout" method="post" className="border-t border-line pt-3">
          <button className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-muted hover:bg-bg hover:text-ink">
            <LogOut className="size-[18px]" strokeWidth={1.75} /> Sign out
          </button>
        </form>
      </aside>

      {/* Desktop top bar */}
      <header className="sticky top-0 z-20 hidden h-14 items-center justify-end gap-2 border-b border-line/70 bg-surface/85 px-6 backdrop-blur-md lg:ml-64 lg:flex">
        <LanguageMenu value={language} />
        <Link href="/inbox" aria-label={unread > 0 ? `Inbox, ${unread} unread` : "Inbox"} className="relative rounded-full p-1.5 text-muted hover:bg-bg hover:text-ink">
          <Bell className="size-5" />
          {unread > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-coral px-1 text-center text-[10px] font-bold leading-4 text-white">{unread > 9 ? "9+" : unread}</span>}
        </Link>
      </header>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-line/70 bg-surface/90 px-3 backdrop-blur-md min-[380px]:px-4 lg:hidden" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <Link href="/dashboard">
          <Logo />
        </Link>
        <div className="flex items-center gap-1.5">
        <LanguageMenu value={language} />
        <Link href="/inbox" aria-label={unread > 0 ? `Inbox, ${unread} unread` : "Inbox"} className="relative rounded-full p-1.5 text-muted hover:bg-bg">
          <Bell className="size-5" />
          {unread > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-coral px-1 text-center text-[10px] font-bold leading-4 text-white">{unread > 9 ? "9+" : unread}</span>}
        </Link>
        <Link href="/achievements" className="flex shrink-0 items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-sun-soft px-2.5 py-1 text-xs font-bold text-warning">
            <Flame className="size-3.5" /> {stats.streak}
          </span>
          <span className="hidden items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary min-[380px]:inline-flex">Lv {stats.level}</span>
        </Link>
        </div>
      </header>

      {/* Mobile tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-surface/95 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Main"
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {TABS.map((t) => {
            const active = t.match.some((m) => isActive(path, m));
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cx("flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition-colors", active ? "text-primary" : "text-muted")}
              >
                <span className={cx("flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-primary-soft")}>
                  <t.icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
                </span>
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
