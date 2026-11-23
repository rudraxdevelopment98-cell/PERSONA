import Link from "next/link";
import { Users } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/db/server";
import { myCircles } from "@/lib/server/social";
import { NewCircleForm } from "./new-circle-form";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Circles" };
export const dynamic = "force-dynamic";

export default async function CirclesPage() {
  const t = await getT();
  const { user } = await requireUser();
  const circles = await myCircles(user.id);
  return (
    <>
      <PageHeader eyebrow={t("Together")} title={t("Circles")} description={t("Small private groups. Share progress, cheer and race.")} />
      <div className="space-y-4">
        {circles.length === 0 ? (
          <Card>
            <EmptyState icon={<Users className="size-6" />} title={t("No circles yet")} description={t("Start one below, then invite people with a link.")} />
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {circles.map((c) => (
              <Link key={c.id} href={`/circles/${c.id}`}>
                <Card className="flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-raised">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-2xl">{c.emoji || "👥"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{c.name}</p>
                    <p className="text-xs text-muted">
                      {c.members}{" "}{t("member")}{c.members === 1 ? "" : "s"} · {t(c.role)}
                      {c.live_races > 0 && " " + t("· {0} live race{1}", c.live_races, c.live_races === 1 ? "" : "s")}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
        <div id="new">
          <NewCircleForm />
        </div>
      </div>
    </>
  );
}
