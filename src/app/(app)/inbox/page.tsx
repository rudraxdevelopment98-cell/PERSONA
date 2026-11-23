import Link from "next/link";
import { Bell } from "lucide-react";
import { PushToggle } from "@/components/social";
import { ReminderToggle } from "@/components/reminder-toggle";
import { getUserState } from "@/lib/server/state";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/db/server";
import { listNotifications, markAllRead } from "@/lib/server/social";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Inbox" };
export const dynamic = "force-dynamic";

function ago(iso: string) {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default async function InboxPage() {
  const t = await getT();
  const { user } = await requireUser();
  const { state } = await getUserState();
  const items = await listNotifications(user.id);
  // Opening the inbox reads everything; this render still highlights what was new.
  if (items.some((i) => !i.read_at)) await markAllRead(user.id);
  return (
    <>
      <PageHeader eyebrow={t("Together")} title={t("Inbox")} description={t("Cheers, invites and race updates from your friends.")} />
      <div className="space-y-4">
        <Card>
          {items.length === 0 ? (
            <EmptyState icon={<Bell className="size-6" />} title={t("Nothing yet")} description={t("When friends cheer you or start a race, it shows up here.")} />
          ) : (
            <div className="divide-y divide-line">
              {items.map((n) => (
                <Link key={n.id} href={n.payload.url || "/friends"} className="flex items-start gap-3 px-5 py-4 hover:bg-bg">
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-coral"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{t(n.payload.title)}</span>
                    <span className="block text-sm text-muted">{n.payload.body}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted">{ago(n.created_at)}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <CardHeader title={t("Phone notifications")} description={t("Get these on your phone or computer, even when the app is closed.")} />
          <div className="space-y-4 px-5 pb-5">
            <PushToggle />
            <ReminderToggle initial={state.profile.reminders_enabled !== false} />
          </div>
        </Card>
      </div>
    </>
  );
}
