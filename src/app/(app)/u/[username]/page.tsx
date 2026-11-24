import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Flame, Lock, Sparkles, Trophy } from "lucide-react";
import { FaceAvatar } from "@/components/moments";
import { ConnectButton } from "@/components/discover";
import { Card } from "@/components/ui";
import { requireUser } from "@/lib/db/server";
import { publicProfile } from "@/lib/server/discover";
import { friendState } from "@/lib/server/social";
import { coverBg } from "@/lib/domain/moments";
import { DIMENSION_META, type Dimension } from "@/lib/domain/dimensions";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return { title: `@${username}` };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const t = await getT();
  const { user } = await requireUser();
  const { username } = await params;
  const p = await publicProfile(user.id, username);
  if (!p) {
    return (
      <div className="mx-auto max-w-lg">
        <Link href="/friends" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> {t("Back")}</Link>
        <Card className="p-8 text-center">
          <Lock className="mx-auto mb-2 size-6 text-muted" />
          <p className="font-semibold">{t("This profile is private")}</p>
          <p className="mt-1 text-sm text-muted">{t("It isn't public, or it doesn't exist. Ask them to share their @username.")}</p>
        </Card>
      </div>
    );
  }
  const state = await friendState(user.id, p.id);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href="/friends" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> {t("Back")}</Link>
      <Card className="overflow-hidden">
        <div className="h-24 w-full" style={{ background: coverBg(p.cover) }} />
        <div className="px-5 pb-5">
          <div className="-mt-10 flex items-end justify-between gap-3">
            <FaceAvatar name={p.name} emoji={p.avatar_emoji} cover={p.cover} size="xl" className="ring-4 ring-surface" />
            <div className="pb-1">{!p.isSelf && <ConnectButton otherId={p.id} state={state} />}</div>
          </div>
          <h1 className="mt-3 text-xl font-extrabold">{p.name}</h1>
          <p className="text-sm text-muted">@{p.username}{!p.isPublic && (p.isSelf || p.isFriend) ? ` · ${t("Private profile")}` : ""}</p>
          {p.bio && <p className="mt-3 text-sm leading-relaxed">{p.bio}</p>}

          {(p.level != null || p.streak != null) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {p.level != null && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-sm font-semibold">
                  <Sparkles className="size-4 text-primary" /> {t(p.level_name ?? "")} · {t("Level {0}", p.level)}
                </span>
              )}
              {p.streak != null && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sun-soft px-3 py-1.5 text-sm font-semibold text-warning">
                  <Flame className="size-4" /> {t("{0}-day streak", p.streak)}
                </span>
              )}
            </div>
          )}

          {p.areas && p.areas.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">{t("Working on")}</p>
              <div className="flex flex-wrap gap-2">
                {p.areas.map((a) => (
                  <span key={a.id} className="rounded-full border border-line bg-surface px-3 py-1 text-sm">{a.emoji} {t(a.label)}</span>
                ))}
              </div>
            </div>
          )}

          {p.badges && p.badges.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted"><Trophy className="size-3.5" /> {t("Badges")}</p>
              <div className="flex flex-wrap gap-1.5">
                {p.badges.slice(0, 12).map((b) => (
                  <span key={b.code} className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">{t(b.title)}</span>
                ))}
              </div>
            </div>
          )}

          {p.scores && Object.keys(p.scores).length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">{t("Skill scores")}</p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {(Object.entries(p.scores) as [Dimension, number][])
                  .filter(([d]) => DIMENSION_META[d])
                  .sort((a, b) => b[1] - a[1])
                  .map(([d, v]) => (
                    <div key={d} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{t(DIMENSION_META[d].label)}</span>
                      <span className="font-semibold tabular-nums">{Math.round(v)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
