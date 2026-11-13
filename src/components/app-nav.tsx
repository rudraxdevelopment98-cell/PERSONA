"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpenCheck,
  ClipboardList,
  GitBranch,
  LayoutDashboard,
  LineChart,
  LogOut,
  Map,
  Menu,
  MessageCircle,
  MessagesSquare,
  NotebookPen,
  Settings,
  X,
} from "lucide-react";
import { Logo } from "./logo";
import { cx } from "./ui";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/today", label: "Daily Development", icon: BookOpenCheck },
  { href: "/decision-lab", label: "Decision Lab", icon: GitBranch },
  { href: "/communication-lab", label: "Communication Lab", icon: MessagesSquare },
  { href: "/coach", label: "AI Coach", icon: MessageCircle },
  { href: "/journal", label: "Journal", icon: NotebookPen },
  { href: "/progress", label: "Progress", icon: LineChart },
  { href: "/programme", label: "90-Day Programme", icon: Map },
  { href: "/assessment", label: "Assessment", icon: ClipboardList },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav className="space-y-0.5">
      {NAV.map((item) => {
        const active = path === item.href || path.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cx(
              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
              active ? "bg-primary-soft font-medium text-ink" : "text-muted hover:bg-primary-soft/60 hover:text-ink",
            )}
          >
            <item.icon className="size-4 shrink-0" strokeWidth={1.75} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Footer({ name, day }: { name: string; day: number }) {
  return (
    <div className="border-t border-line pt-3">
      <div className="px-2.5">
        <p className="truncate text-sm font-medium text-ink">{name}</p>
        <p className="text-xs text-muted">{day > 0 ? `Day ${day} of 90` : "Programme not started"}</p>
      </div>
      <form action="/auth/signout" method="post" className="mt-2">
        <button className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted hover:bg-primary-soft/60 hover:text-ink">
          <LogOut className="size-4" strokeWidth={1.75} /> Sign out
        </button>
      </form>
    </div>
  );
}

export function AppNav({ name, day }: { name: string; day: number }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-surface px-3 py-4 lg:flex">
        <Link href="/dashboard" className="mb-6 px-2.5">
          <Logo />
        </Link>
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <Footer name={name} day={day} />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur lg:hidden">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <button onClick={() => setOpen(true)} className="rounded-md p-2 text-muted hover:bg-primary-soft" aria-label="Open menu">
          <Menu className="size-5" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/20" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col bg-surface px-3 py-4 shadow-raised">
            <div className="mb-4 flex items-center justify-between px-2.5">
              <Logo />
              <button onClick={() => setOpen(false)} className="rounded-md p-1.5 text-muted hover:bg-primary-soft" aria-label="Close menu">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
            <Footer name={name} day={day} />
          </div>
        </div>
      )}
    </>
  );
}
