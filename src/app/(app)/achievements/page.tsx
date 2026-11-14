import { Flame, Lock, Zap } from "lucide-react";
import { BadgeIcon } from "@/components/badge-icon";
import { ReminderButton } from "@/components/reminder-button";
import { Card, CardHeader, PageHeader, ProgressRing, cx } from "@/components/ui";
import { XP_RULES } from "@/lib/domain/gamification";
import { ACHIEVEMENTS, getGamification } from "@/lib/server/gamification";
import { getUserState } from "@/lib/server/state";

export const metadata = { title: "Achievements" };

const XP_LABELS: Record<keyof typeof XP_RULES, string> = {
  assessment: "Initial assessment",
  checkin: "Daily check-in",
  storyRead: "Read the story",
  scenario: "Each scenario",
  sessionComplete: "Complete a session",
  challenge: "Real-world challenge",
  decision: "Decision Lab",
  communication: "Communication Lab",
  voiceBonus: "Voice practice bonus",
  journal: "Journal entry",
};

export default async function AchievementsPage() {
  const [{ db, user }, { stats, level }] = await Promise.all([getUserState(), getGamification()]);
  const { data } = await db.from("achievements").select("code, earned_at").eq("user_id", user.id);
  const earned = new Map((data ?? []).map((a) => [a.code as string, a.earned_at as string]));

  return (
    <>
      <PageHeader eyebrow="Achievements" title="Your journey" description="XP, levels and badges come only from things you have actually done." />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="flex items-center gap-4 p-5 md:col-span-2">
          <ProgressRing value={level.progress} size={96} stroke={10} label={`Level ${level.level}`}>
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase text-muted">Level</p>
              <p className="text-2xl font-extrabold leading-none">{level.level}</p>
            </div>
          </ProgressRing>
          <div>
            <p className="text-xl font-extrabold">{level.name}</p>
            <p className="mt-0.5 text-sm text-muted">
              {stats.xp} XP total · {level.toNext} XP to level {level.level + 1}
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-sun-soft text-warning">
            <Flame className="size-7" />
          </span>
          <div>
            <p className="text-2xl font-extrabold tabular-nums">{stats.streak}</p>
            <p className="text-sm text-muted">day streak · best {stats.bestStreak}</p>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Badges" description={`${earned.size} of ${ACHIEVEMENTS.length} earned`} />
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-4">
          {ACHIEVEMENTS.map((a) => {
            const got = earned.has(a.code);
            return (
              <div key={a.code} className={cx("rounded-2xl border p-4 text-center transition", got ? "border-sun/40 bg-sun-soft/60" : "border-line bg-bg/60")}>
                <span
                  className={cx(
                    "mx-auto flex size-12 items-center justify-center rounded-full",
                    got ? "bg-sun text-white shadow-raised" : "bg-line text-muted",
                  )}
                >
                  {got ? <BadgeIcon name={a.icon} className="size-6" /> : <Lock className="size-5" />}
                </span>
                <p className={cx("mt-2 text-sm font-bold", !got && "text-muted")}>{a.title}</p>
                <p className="mt-0.5 text-xs text-muted">{a.description}</p>
                {got && <p className="mt-1 text-[11px] font-semibold text-warning">{new Date(earned.get(a.code)!).toLocaleDateString("en-GB")}</p>}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="How to earn XP" />
          <ul className="divide-y divide-line px-5 pb-3">
            {(Object.keys(XP_RULES) as (keyof typeof XP_RULES)[]).map((k) => (
              <li key={k} className="flex items-center justify-between py-2 text-sm">
                {XP_LABELS[k]}
                <span className="inline-flex items-center gap-1 font-bold text-accent">
                  <Zap className="size-3.5" />+{XP_RULES[k]}
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Daily reminder" description="Adds a repeating event to your phone or computer calendar for the next 90 days." />
          <div className="p-5 pt-3">
            <ReminderButton />
          </div>
        </Card>
      </div>
    </>
  );
}
