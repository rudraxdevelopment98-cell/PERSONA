import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Flag, Users } from "lucide-react";
import { RankBadge } from "@/components/social";
import { Alert, Badge, ButtonLink, Card, CardHeader, PageHeader, ProgressBar } from "@/components/ui";
import { requireUser } from "@/lib/db/server";
import { RACE_KINDS } from "@/lib/domain/social";
import { SocialError, raceView } from "@/lib/server/social";
import { RaceJoin } from "./race-join";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

function timeLeft(end: string) {
  const ms = Date.parse(end) - Date.now();
  if (ms <= 0) return "Finished";
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  return d > 0 ? `${d}d ${h}h left` : `${h}h ${Math.max(1, Math.floor((ms % 3_600_000) / 60_000))}m left`;
}

export default async function RacePage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { user } = await requireUser();
  let data;
  try {
    data = await raceView(user.id, id);
  } catch (err) {
    if (err instanceof SocialError) notFound();
    throw err;
  }
  const { race, rows, teamTotals, joined } = data;
  const kind = RACE_KINDS.find((k) => k.id === race.kind)!;
  const top = Math.max(1, ...rows.map((r) => r.score));
  const winnerTeam = teamTotals && race.ended ? [...teamTotals].sort((a, b) => b.score - a.score)[0] : null;
  const me = rows.find((r) => r.isMe);

  return (
    <>
      <ButtonLink href={race.circleId ? `/circles/${race.circleId}` : "/friends"} variant="ghost" className="mb-3 -ml-2 h-8 px-2">
        <ArrowLeft className="size-4" />{" "}{t("Back")}</ButtonLink>
      <PageHeader eyebrow={t(kind.label)} title={t(race.title)} description={t(kind.description)} />
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center">
            <Clock className="mx-auto size-5 text-primary" />
            <p className="mt-1 text-sm font-bold">{timeLeft(race.endsAt)}</p>
          </Card>
          <Card className="p-4 text-center">
            <Users className="mx-auto size-5 text-accent" />
            <p className="mt-1 text-sm font-bold">{t("{0} racing", rows.length)}</p>
          </Card>
          <Card className="p-4 text-center">
            <Flag className="mx-auto size-5 text-warning" />
            <p className="mt-1 text-sm font-bold">{me ? t("You: #{0}", me.rank) : t("Not joined")}</p>
          </Card>
        </div>

        {race.ended && me && <Alert tone="success">{t("Race finished - you placed #")}{me.rank}{" "}{t("with")}{" "}{me.score} {t(kind.unit)}. {me.rank === 1 ? t("Winner! 🏆") : t("Great effort!")}</Alert>}

        {teamTotals && (
          <div className="grid grid-cols-2 gap-3">
            {teamTotals.map((tm) => (
              <Card key={tm.team} className={`p-4 text-center ${winnerTeam?.team === tm.team ? "border-warning" : ""}`}>
                <p className="text-xs font-bold uppercase text-muted">{t("Team")}{" "}{tm.team === 1 ? t("Blue") : t("Orange")}</p>
                <p className="text-2xl font-extrabold">{tm.score}</p>
                {winnerTeam?.team === tm.team && <Badge tone="sun">{t("Winners")}</Badge>}
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardHeader title={race.ended ? t("Final results") : t("Live standings")} description={race.ended ? undefined : t("Updates as people complete activities. Only activity during the race counts.")} />
          <div className="divide-y divide-line p-2">
            {rows.length === 0 && <p className="p-3 text-sm text-muted">{t("Nobody has joined yet.")}</p>}
            {rows.map((r, i) => (
              <div key={r.userId ?? `p${i}`} className={`flex items-center gap-3 px-3 py-3 ${r.isMe ? "rounded-xl bg-primary-soft/50" : ""}`}>
                <RankBadge rank={r.rank} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-bold">
                    {r.isMe ? t("You") : r.name}
                    {r.team && <span className={`size-2 rounded-full ${r.team === 1 ? "bg-sky" : "bg-coral"}`} aria-label={t("Team {0}", r.team)} />}
                  </p>
                  <ProgressBar value={(r.score / top) * 100} className="mt-1.5" tone={r.isMe ? "primary" : "accent"} />
                </div>
                <span className="w-20 text-right text-sm font-extrabold">
                  {r.score} <span className="text-xs font-semibold text-muted">{t(kind.unit)}</span>
                </span>
              </div>
            ))}
          </div>
        </Card>

        {!race.ended && <RaceJoin raceId={race.id} joined={joined} />}
      </div>
    </>
  );
}
