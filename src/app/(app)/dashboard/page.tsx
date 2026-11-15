import Link from "next/link";
import { ArrowRight, BookOpen, Check, ClipboardCheck, Flame, GitBranch, Lightbulb, Mic, PenLine, Sparkles, Target, Zap } from "lucide-react";
import { BadgeIcon } from "@/components/badge-icon";
import { BaselineGate } from "@/components/baseline-gate";
import { ScoreBars } from "@/components/score-bars";
import { Badge, ButtonLink, Card, CardHeader, IconTile, PageHeader, ProgressRing, cx } from "@/components/ui";
import { DIMENSION_META } from "@/lib/domain/dimensions";
import { PROGRAMME_LENGTH } from "@/lib/domain/programme";
import { overallScore } from "@/lib/domain/scoring";
import { ACHIEVEMENTS, getGamification } from "@/lib/server/gamification";
import { getUserState, todaysFocus } from "@/lib/server/state";
import { GENRES, WORLDS, byId, seasonFor } from "@/lib/domain/variety";
import { REST_WINDOW } from "@/lib/domain/programme";
import type { CheckinRow, SessionRow } from "@/lib/server/types";

export const metadata = { title: "Home" };

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function Dashboard() {
  const [{ db, user, state }, { stats, level }] = await Promise.all([getUserState(), getGamification()]);
  const name = state.profile.display_name || "there";

  if (!state.baseline) {
    return (
      <>
        <PageHeader eyebrow="Welcome" title={`Hi, ${name} 👋`} description="Your programme starts with a short assessment of how you currently think and act." />
        <BaselineGate feature="Your 90-day programme" />
      </>
    );
  }

  const focus = todaysFocus(state);
  const [{ data: checkin }, { data: session }, { data: achievements }] = await Promise.all([
    db.from("daily_checkins").select("completed_at, analysis").eq("user_id", user.id).eq("checkin_date", state.today).maybeSingle(),
    db
      .from("daily_sessions")
      .select("id, story_completed_at, scenarios_completed_at, challenge_status, completed_at")
      .eq("user_id", user.id)
      .eq("day_number", state.day)
      .maybeSingle(),
    db.from("achievements").select("code, earned_at").eq("user_id", user.id).order("earned_at", { ascending: false }).limit(4),
  ]);
  // Latest story episode, for the "Your series" card.
  const { data: latestRows } = await db
    .from("daily_sessions")
    .select("day_number, variety, completed_at")
    .eq("user_id", user.id)
    .order("day_number", { ascending: false })
    .limit(1);
  const latest = (latestRows?.[0] ?? null) as Pick<SessionRow, "day_number" | "variety" | "completed_at"> | null;

  const c = checkin as Pick<CheckinRow, "completed_at" | "analysis"> | null;
  const s = session as Pick<SessionRow, "id" | "story_completed_at" | "scenarios_completed_at" | "challenge_status" | "completed_at"> | null;
  const overall = overallScore(state.skills) ?? 0;
  const baselineOverall = overallScore(state.skills.map((k) => ({ current: k.baseline }))) ?? 0;

  const steps = [
    { label: "Check-in", detail: "3 min", done: Boolean(c?.completed_at), icon: ClipboardCheck, tone: "sky" as const },
    { label: "Story", detail: "10 min", done: Boolean(s?.story_completed_at), icon: BookOpen, tone: "primary" as const },
    { label: "Scenarios", detail: "7 min", done: Boolean(s?.scenarios_completed_at), icon: GitBranch, tone: "accent" as const },
    { label: "Reflection", detail: "3 min", done: Boolean(s?.completed_at), icon: PenLine, tone: "sun" as const },
    { label: "Challenge", detail: "in real life", done: s?.challenge_status === "completed", icon: Target, tone: "coral" as const },
  ];
  const done = steps.filter((x) => x.done).length;
  const nextIndex = steps.findIndex((x) => !x.done);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: state.profile.timezone }).format(new Date()));
  const badgeDefs = new Map(ACHIEVEMENTS.map((a) => [a.code, a]));
  const restUsed = stats.restDays.some((d) => state.day - d < REST_WINDOW);

  // Series card: today's episode if built, otherwise a teaser of the next one.
  const lv = latest?.variety ?? null;
  const series = lv
    ? latest!.day_number === state.day
      ? { label: `Season ${lv.season} · Episode ${lv.episode}${lv.finale ? " · Finale" : ""}`, title: lv.episode_title ?? "Today's episode", line: latest!.completed_at ? (lv.teaser || "Season finale done - pick the next world on Today.") : "Your episode is ready.", cta: latest!.completed_at ? "See today" : "Continue" }
      : {
          label: (() => {
            const next = seasonFor(state.day);
            return next.season === lv.season ? `Up next · Season ${lv.season} · Episode ${lv.episode + 1}` : `Up next · Season ${next.season} begins`;
          })(),
          title: seasonFor(state.day).season === lv.season ? (lv.teaser || "The story continues today.") : "A new world, new characters.",
          line: `${byId(WORLDS, lv.world)?.label ?? ""} · ${byId(GENRES, lv.genre)?.label ?? ""}`,
          cta: "Start today",
        }
    : null;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="animate-rise overflow-hidden rounded-2xl bg-primary text-white shadow-raised">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-sm text-white/70">
              {greeting(hour)}, {name}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Day {state.day} <span className="text-white/50">/ {PROGRAMME_LENGTH}</span>
            </h1>
            <p className="mt-1 text-sm text-white/80">
              Phase {focus.phase.number} · {focus.phase.name} — today: <span className="font-semibold text-white">{focus.title}</span>
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-amber-300">
                <Flame className="size-3.5" /> {stats.streak}-day streak
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-teal-300">
                <Zap className="size-3.5" /> {stats.xp} XP · Level {level.level}
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-sky-200"
                title="Miss one day and your streak survives - once every 7 days."
              >
                ❄️ {restUsed ? "Rest day used this week" : "1 rest day available"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ProgressRing value={(done / steps.length) * 100} size={92} stroke={9} color="#2dd4bf" track="rgba(255,255,255,0.15)" label={`${done} of 5 done today`}>
              <div className="text-center">
                <p className="text-xl font-extrabold leading-none">
                  {done}/{steps.length}
                </p>
                <p className="text-[10px] text-white/70">today</p>
              </div>
            </ProgressRing>
            {nextIndex !== -1 && (
              <ButtonLink href="/today" className="bg-white text-primary hover:bg-white/90">
                {nextIndex === 0 ? "Start today" : "Continue"} <ArrowRight className="size-4" />
              </ButtonLink>
            )}
          </div>
        </div>
      </section>

      {series && (
        <Link href="/today" className="group block">
          <Card className="flex items-center gap-4 p-4 transition group-hover:-translate-y-0.5 group-hover:shadow-raised sm:p-5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-2xl">🎬</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-accent">{series.label}</p>
              <p className="mt-0.5 font-serif text-lg font-semibold leading-snug">{series.title}</p>
              <p className="text-sm text-muted">{series.line}</p>
            </div>
            <span className="hidden shrink-0 items-center gap-1 text-sm font-bold text-primary sm:inline-flex">
              {series.cta} <ArrowRight className="size-4" />
            </span>
          </Card>
        </Link>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Today's path */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Today's path"
            description={<>Focus: {DIMENSION_META[focus.dimension].label}</>}
            action={focus.personalised ? <Badge tone="accent">Personalised</Badge> : undefined}
          />
          <div className="grid grid-cols-5 gap-2 p-5">
            {steps.map((st, i) => (
              <Link key={st.label} href="/today" className="group flex flex-col items-center text-center">
                <span
                  className={cx(
                    "relative flex size-12 items-center justify-center rounded-2xl transition group-hover:scale-105 sm:size-14",
                    st.done ? "bg-success text-white" : i === nextIndex ? "bg-primary text-white shadow-raised" : "bg-bg text-muted",
                  )}
                >
                  {st.done ? <Check className="size-6" strokeWidth={3} /> : <st.icon className="size-6" />}
                </span>
                <span className={cx("mt-2 text-xs font-bold", !st.done && i !== nextIndex && "text-muted")}>{st.label}</span>
                <span className="text-[11px] text-muted">{st.detail}</span>
              </Link>
            ))}
          </div>
          {c?.analysis && (
            <div className="mx-5 mb-5 flex gap-3 rounded-2xl bg-accent-soft p-4">
              <Lightbulb className="mt-0.5 size-5 shrink-0 text-accent" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-accent">Try today</p>
                <p className="mt-0.5 text-sm leading-relaxed">{c.analysis.suggestion_for_today}</p>
              </div>
            </div>
          )}
        </Card>

        {/* Score */}
        <Card className="flex flex-col items-center justify-center p-5 text-center">
          <ProgressRing value={overall} size={120} stroke={11} label={`Overall score ${overall}`}>
            <div>
              <p className="text-3xl font-extrabold leading-none tabular-nums">{Math.round(overall)}</p>
              <p className="text-[11px] text-muted">overall</p>
            </div>
          </ProgressRing>
          <p className="mt-3 text-sm">
            <span className={cx("font-bold", overall - baselineOverall >= 0 ? "text-success" : "text-danger")}>
              {overall - baselineOverall >= 0 ? "+" : ""}
              {Math.round((overall - baselineOverall) * 10) / 10}
            </span>{" "}
            <span className="text-muted">since you started</span>
          </p>
          <Link href="/progress" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
            See progress <ArrowRight className="size-3.5" />
          </Link>
        </Card>
      </div>

      {/* Quick practice */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { href: "/decision-lab", title: "Decision Lab", text: "Make a tough call", icon: GitBranch, tone: "sky" as const },
          { href: "/communication-lab", title: "Speak up", text: "Voice practice", icon: Mic, tone: "coral" as const },
          { href: "/coach", title: "Ask your coach", text: "Talk it through", icon: Sparkles, tone: "accent" as const },
        ].map((q) => (
          <Link key={q.href} href={q.href}>
            <Card className="flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-raised">
              <IconTile tone={q.tone}>
                <q.icon className="size-5" />
              </IconTile>
              <div>
                <p className="text-sm font-bold">{q.title}</p>
                <p className="text-xs text-muted">{q.text}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Your skills" description="Bar = now · tick = when you started" />
          <div className="px-5 pb-5 pt-3">
            <ScoreBars rows={state.skills} />
          </div>
        </Card>
        <Card>
          <CardHeader
            title="Badges"
            action={
              <Link href="/achievements" className="text-xs font-bold text-primary hover:underline">
                All
              </Link>
            }
          />
          {(achievements ?? []).length === 0 ? (
            <p className="px-5 pb-5 pt-2 text-sm text-muted">Complete activities to earn badges.</p>
          ) : (
            <ul className="space-y-1 px-3 pb-4 pt-2">
              {(achievements ?? []).map((a) => {
                const def = badgeDefs.get(a.code as string);
                return (
                  <li key={a.code} className="flex items-center gap-3 rounded-xl px-2 py-2">
                    <span className="flex size-9 items-center justify-center rounded-full bg-sun text-white">
                      <BadgeIcon name={def?.icon ?? "trophy"} className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-bold">{def?.title ?? a.code}</p>
                      <p className="text-xs text-muted">{def?.description}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
