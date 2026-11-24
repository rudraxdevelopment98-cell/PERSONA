import Link from "next/link";
import {
  AtSign, BookOpen, ChevronRight, CircleUserRound, Database, FileText, HeartHandshake,
  KeyRound, LifeBuoy, type LucideIcon, Palette, ShieldCheck, Sparkles, UserRound,
} from "lucide-react";
import { PageHeader } from "@/components/ui";
import { getConnectionSummary, PROVIDER_LABELS } from "@/lib/server/ai-connection";
import { recoveryStatus } from "@/lib/server/recovery";
import { getDiscovery } from "@/lib/server/discover";
import { getUserState } from "@/lib/server/state";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const t = await getT();
  const { db, user, state } = await getUserState();
  const [connection, recovery, discovery] = await Promise.all([
    getConnectionSummary(db, user.id),
    recoveryStatus(db, user.id),
    getDiscovery(user.id),
  ]);

  const groups: { title: string; rows: { href: string; icon: LucideIcon; label: string; value?: string; danger?: boolean }[] }[] = [
    {
      title: "Account",
      rows: [
        { href: "/settings/account", icon: CircleUserRound, label: "Account", value: user.email },
        { href: "/settings/profile", icon: AtSign, label: "Profile & privacy", value: discovery.username ? `@${discovery.username}` : t(discovery.isPublic ? "Public" : "Private") },
        { href: "/settings/life", icon: HeartHandshake, label: "Your life", value: state.profile.life_stage ? t(STAGE_LABEL[state.profile.life_stage] ?? "") : t("Not set") },
      ],
    },
    {
      title: "AI & coach",
      rows: [
        { href: "/settings/ai", icon: Sparkles, label: "Your AI", value: connection ? PROVIDER_LABELS[connection.provider] : t("App default") },
        { href: "/settings/privacy", icon: ShieldCheck, label: "Coach & journal privacy" },
      ],
    },
    {
      title: "App",
      rows: [
        { href: "/settings/appearance", icon: Palette, label: "Appearance" },
        { href: "/settings/security", icon: KeyRound, label: "Password & security", value: t("{0} codes left", recovery.remaining) },
      ],
    },
    {
      title: "Data & support",
      rows: [
        { href: "/settings/data", icon: Database, label: "Your data" },
        { href: "/guide", icon: BookOpen, label: "Guide: how it works" },
        { href: "/settings/help", icon: LifeBuoy, label: "Help & contact" },
        { href: "/privacy", icon: FileText, label: "Privacy & terms" },
      ],
    },
  ];

  return (
    <>
      <PageHeader title={t("Settings")} description={t("Your account, profile, AI and privacy.")} />
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Profile header */}
        <Link href="/settings/profile" className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 hover:bg-bg">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary"><UserRound className="size-6" /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-bold">{state.profile.display_name || t("You")}</span>
            <span className="block truncate text-sm text-muted">{discovery.username ? `@${discovery.username}` : t("Tap to set a username")}</span>
          </span>
          <ChevronRight className="size-5 text-muted" />
        </Link>

        {groups.map((g) => (
          <div key={g.title}>
            <p className="mb-1.5 px-1 text-xs font-bold uppercase tracking-wide text-muted">{t(g.title)}</p>
            <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {g.rows.map((r) => (
                <Link key={r.href} href={r.href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-bg">
                  <r.icon className={`size-5 shrink-0 ${r.danger ? "text-danger" : "text-muted"}`} />
                  <span className={`flex-1 text-sm font-medium ${r.danger ? "text-danger" : ""}`}>{t(r.label)}</span>
                  {r.value && <span className="max-w-[40%] truncate text-sm text-muted">{r.value}</span>}
                  <ChevronRight className="size-4 shrink-0 text-muted" />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

const STAGE_LABEL: Record<string, string> = {
  student: "Student", working: "Working", business: "Business owner", home: "At home", seeking: "Job seeking", other: "Other",
};
