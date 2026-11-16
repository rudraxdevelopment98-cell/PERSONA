"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Dumbbell, Flame, Gem, Home, LogOut, Play, ShieldCheck, Users } from "lucide-react";
import { Logo } from "./logo";
import { LanguageMenu } from "./language-menu";
import type { Language } from "@/lib/ai/prompts";
import { ProgressRing, cx } from "./ui";

export type NavStats = { level: number; levelName: string; progress: number; toNext: number; xp: number; streak: number };

/** The five places in the app. Everything else lives one tap inside one of them. */
const TABS = [
  { href: "/dashboard", label: "Home", icon: Home, match: ["/dashboard", "/welcome"] },
  { href: "/practice", label: "Practice", icon: Dumbbell, match: ["/practice", "/decision-lab", "/communication-lab", "/coach"] },
  { href: "/today", label: "Today", icon: Play, match: ["/today"], hero: true },
  { href: "/friends", label: "Friends", icon: Users, match: ["/friends", "/circles", "/races"] },
  { href: "/me", label: "Me", icon: null, match: ["/me", "/progress", "/achievements", "/journal", "/programme", "/assessment", "/settings"] },
] as const;

const isActive = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

function Avatar({ name, active, size = "size-7" }: { name: string; active: boolean; size?: string }) {
  return (
    <span
      className={cx(
        "flex items-center justify-center rounded-full text-xs font-extrabold transition-all",
        size,
        active ? "bg-brand text-white ring-2 ring-primary/30 ring-offset-2 ring-offset-surface" : "bg-primary-soft text-ink",
      )}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function Bubble({ n }: { n: number }) {
  if (n <= 0) return null;
  return <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-coral px-1 text-center text-[10px] font-bold leading-4 text-white">{n > 9 ? "9+" : n}</span>;
}

function BellLink({ unread }: { unread: number }) {
  return (
    <Link href="/inbox" aria-label={unread > 0 ? `Inbox, ${unread} unread` : "Inbox"} title="Inbox" className="relative rounded-full p-2 text-muted transition-colors hover:bg-primary-soft hover:text-ink">
      <Bell className="size-5" />
      <Bubble n={unread} />
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
  pro = false,
}: {
  name: string;
  day: number;
  stats: NavStats;
  unread?: number;
  language?: Language;
  /** Open report count for admins; null for everyone else. */
  adminReports?: number | null;
  pro?: boolean;
}) {
  const path = usePathname();
  const extra = [
    ...(pro ? [] : [{ href: "/pricing", label: "Go Pro", icon: Gem }]),
    ...(adminReports == null ? [] : [{ href: "/admin", label: "Admin", icon: ShieldCheck }]),
  ];

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface px-3 py-5 lg:flex">
        <Link href="/dashboard" className="mb-7 px-3">
          <Logo />
        </Link>
        <nav className="flex-1 space-y-1" aria-label="Main">
          {TABS.map((t) => {
            const active = t.match.some((m) => isActive(path, m));
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "group flex items-center gap-3.5 rounded-2xl px-3 py-2.5 text-[15px] transition-colors",
                  active ? "bg-primary-soft font-bold text-ink" : "font-medium text-muted hover:bg-bg hover:text-ink",
                )}
              >
                {t.icon ? (
                  <span className={cx("flex size-7 items-center justify-center rounded-full", "hero" in t && t.hero && "bg-brand text-white")}>
                    <t.icon className={cx("size-[19px] transition-transform group-hover:scale-110", "hero" in t && t.hero && "size-3.5 fill-current")} strokeWidth={active ? 2.4 : 1.8} />
                  </span>
                ) : (
                  <Avatar name={name} active={active} />
                )}
                {t.label}
              </Link>
            );
          })}
          <Link
            href="/inbox"
            aria-current={isActive(path, "/inbox") ? "page" : undefined}
            className={cx(
              "flex items-center gap-3.5 rounded-2xl px-3 py-2.5 text-[15px] transition-colors",
              isActive(path, "/inbox") ? "bg-primary-soft font-bold text-ink" : "font-medium text-muted hover:bg-bg hover:text-ink",
            )}
          >
            <span className="relative flex size-7 items-center justify-center">
              <Bell className="size-[19px]" strokeWidth={1.8} />
              <Bubble n={unread} />
            </span>
            Inbox
          </Link>
          {extra.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={cx(
                "flex items-center gap-3.5 rounded-2xl px-3 py-2.5 text-[15px] transition-colors",
                isActive(path, t.href) ? "bg-primary-soft font-bold text-ink" : "font-medium text-muted hover:bg-bg hover:text-ink",
              )}
            >
              <span className="flex size-7 items-center justify-center">
                <t.icon className="size-[19px]" strokeWidth={1.8} />
              </span>
              {t.label}
              {t.href === "/admin" && (adminReports ?? 0) > 0 && <span className="ml-auto rounded-full bg-danger px-1.5 text-[11px] font-bold text-white">{adminReports}</span>}
            </Link>
          ))}
        </nav>

        <Link href="/achievements" className="flex items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-bg">
          <ProgressRing value={stats.progress} size={40} stroke={4} label={`Level ${stats.level}`}>
            <span className="text-xs font-extrabold">{stats.level}</span>
          </ProgressRing>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 truncate text-sm font-bold text-ink">
              {name}
              {pro && <span className="bg-brand rounded-full px-1.5 text-[9px] font-extrabold text-white">PRO</span>}
            </span>
            <span className="flex items-center gap-2 text-xs text-muted">
              <span className="inline-flex items-center gap-0.5 font-semibold text-sun">
                <Flame className="size-3.5" />
                {stats.streak}
              </span>
              {day > 0 ? `Day ${day}/90` : ""}
            </span>
          </span>
        </Link>
        <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
          <form action="/auth/signout" method="post">
            <button aria-label="Sign out" title="Sign out" className="rounded-full p-2 text-muted hover:bg-bg hover:text-ink">
              <LogOut className="size-5" strokeWidth={1.75} />
            </button>
          </form>
          <div className="flex items-center">
            <LanguageMenu value={language} up />
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header
        className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 bg-bg/80 px-3 backdrop-blur-xl min-[380px]:px-4 lg:hidden"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <Link href="/dashboard" aria-label="Home">
          <Logo />
        </Link>
        <div className="flex items-center gap-0.5">
          <Link href="/achievements" aria-label={`${stats.streak}-day streak`} className="mr-1 inline-flex items-center gap-1 rounded-full bg-sun-soft px-2.5 py-1 text-xs font-bold text-warning">
            <Flame className="size-3.5" /> {stats.streak}
          </Link>
          <LanguageMenu value={language} />
          <BellLink unread={unread} />
        </div>
      </header>

      {/* Mobile tab bar: icons only, today's session in the middle */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line/60 bg-surface/95 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Main"
      >
        <div className="mx-auto grid h-14 max-w-md grid-cols-5 items-center">
          {TABS.map((t) => {
            const active = t.match.some((m) => isActive(path, m));
            const hero = "hero" in t && t.hero;
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-label={t.label}
                aria-current={active ? "page" : undefined}
                className="flex h-full items-center justify-center"
              >
                {hero ? (
                  <span className={cx("bg-brand flex size-11 items-center justify-center rounded-2xl text-white shadow-raised transition-transform active:scale-90", active && "ring-2 ring-primary/30 ring-offset-2 ring-offset-surface")}>
                    <Play className="ml-0.5 size-5 fill-current" />
                  </span>
                ) : t.icon ? (
                  <t.icon className={cx("size-6 transition-all active:scale-90", active ? "text-ink" : "text-muted")} strokeWidth={active ? 2.5 : 1.75} />
                ) : (
                  <Avatar name={name} active={active} />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
