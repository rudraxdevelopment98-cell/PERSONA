import Link from "next/link";
import { ArrowRight, BookOpen, Check, ChevronRight, ClipboardCheck, GitBranch, Layers, Lightbulb, Mic, Leaf, PenLine, ShieldCheck, Sparkles, Target, Zap } from "lucide-react";
import { BadgeIcon } from "@/components/badge-icon";
import { BaselineGate } from "@/components/baseline-gate";
import { ScoreBars } from "@/components/score-bars";
import { Card, PageHeader, ProgressRing, cx } from "@/components/ui";
import { PROGRAMME_LENGTH } from "@/lib/domain/programme";
import { overallScore } from "@/lib/domain/scoring";
import { ACHIEVEMENTS, getGamification } from "@/lib/server/gamification";
import { getUserState, todaysFocus } from "@/lib/server/state";
import { GENRES, WORLDS, byId, seasonFor } from "@/lib/domain/variety";
import { REST_WINDOW } from "@/lib/domain/programme";
import { pickSponsor } from "@/lib/server/sponsors";
import { SponsorCard } from "@/components/sponsor-card";
import { InstallApp } from "@/components/install-app";
import { DailyPoll } from "@/components/daily-poll";
import { LifePicker } from "@/components/life-picker";
import { todayPoll } from "@/lib/server/poll";
import { recoveryStatus } from "@/lib/server/recovery";
import type { CheckinRow, SessionRow } from "@/lib/server/types";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Home" };

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function Dashboard() {
  const t = await getT();
  const [{ db, user, state }, { stats, level }] = await Promise.all([getUserState(), getGamification()]);
  const name = state.profile.display_name || "there";

  if (!state.baseline) {
    return (
      <>
        <PageHeader title={t("Hi, {0} 👋", name)} />
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
  const sponsor = await pickSponsor(user.id, "dashboard", { language: state.profile.language, skill: focus.dimension, day: state.today });

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

  const quick = [
    { href: "/practice/cards", label: "Cards", icon: Layers, tone: "bg-accent text-white" },
    { href: "/decision-lab", label: "Decide", icon: GitBranch, tone: "bg-sky-soft text-sky" },
    { href: "/communication-lab", label: "Speak", icon: Mic, tone: "bg-coral-soft text-coral" },
    { href: "/coach", label: "Coach", icon: Sparkles, tone: "bg-accent-soft text-accent" },
    { href: "/journal", label: "Journal", icon: PenLine, tone: "bg-sun-soft text-warning" },
    { href: "/calm", label: "Calm", icon: Leaf, tone: "bg-primary-soft text-primary" },
  ];
  const delta = Math.round((overall - baselineOverall) * 10) / 10;

  return (
    <div className="space-y-6">
      {/* Header: who, what day, three numbers */}
      <section className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted">
            {t("{0}, {1}", t(greeting(hour)), name)}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">{t("Day")}{" "}{state.day}
            <span className="text-muted"> / {PROGRAMME_LENGTH}</span>
          </h1>
        </div>
        <div className="flex shrink-0 gap-1.5 text-xs font-bold">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1.5 text-primary" title={t("{0} XP", stats.xp)}>
            <Zap className="size-3.5" />{" "}{t("Lv")}{" "}{level.level}
          </span>
          <span
            className={cx("inline-flex items-center rounded-full px-2.5 py-1.5", restUsed ? "bg-bg text-muted/50" : "bg-sky-soft")}
            title={restUsed ? t("Rest day used this week") : t("1 rest day available: miss a day, keep your streak")}
            aria-label={restUsed ? t("Rest day used this week") : t("1 rest day available")}
          >
            ❄️
          </span>
        </div>
      </section>

      {/* Small asks wait until the first episode is done, so day 1 is only about the episode. */}
      {stats.sessionsCompleted > 0 && (await recoveryStatus(db, user.id)).total === 0 && (
        <Link href="/welcome" className="flex items-center gap-3 rounded-3xl border border-line bg-surface p-4 transition hover:shadow-raised">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <ShieldCheck className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">{t("Account secure karo · 1 min")}</span>
            <span className="block text-xs text-muted">{t("Password bhool gaye to bhi wapas aa sako: recovery codes save karo.")}</span>
          </span>
        </Link>
      )}
      {stats.sessionsCompleted > 0 && <InstallApp />}

      {/* Today's episode: the one thing to do */}
      <Link href="/today" className="group block">
        <section className="bg-brand relative overflow-hidden rounded-[28px] p-5 text-white shadow-raised transition-transform group-active:scale-[0.99] sm:p-7">
          <div className="pointer-events-none absolute -right-10 -top-16 size-48 rounded-full bg-white/10 blur-2xl" />
          <p className="text-xs font-bold uppercase tracking-wider text-white/70">
            {series ? t(series.label) : t("Phase {0} · {1}", focus.phase.number, t(focus.phase.name))}
          </p>
          <h2 className="mt-1.5 line-clamp-2 font-serif text-2xl font-semibold leading-snug sm:text-3xl">{series ? t(series.title) : t(focus.title)}</h2>
          <div className="mt-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5" aria-label={t("{0} of {1} done today", done, steps.length)}>
              {steps.map((st, i) => (
                <span
                  key={st.label}
                  title={t(st.label)}
                  className={cx(
                    "flex size-8 items-center justify-center rounded-full transition",
                    st.done ? "bg-white text-primary" : i === nextIndex ? "bg-white/25 ring-2 ring-white" : "bg-white/15 text-white/70",
                  )}
                >
                  {st.done ? <Check className="size-4" strokeWidth={3} /> : <st.icon className="size-4" />}
                </span>
              ))}
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-primary transition group-hover:gap-2.5">
              {nextIndex === -1 ? t("View") : nextIndex === 0 ? t("Start") : t("Continue")} <ArrowRight className="size-4" />
            </span>
          </div>
        </section>
      </Link>

      {c?.analysis?.suggestion_for_today && (
        <div className="flex items-start gap-3 rounded-3xl bg-accent-soft px-4 py-3.5">
          <Lightbulb className="mt-0.5 size-5 shrink-0 text-accent" />
          <p className="text-sm leading-relaxed">{t(c.analysis.suggestion_for_today)}</p>
        </div>
      )}

      {!state.profile.life_stage && <LifePicker />}

      <DailyPoll initial={await todayPoll(user.id)} />

      {/* Quick practice, story-row style */}
      <nav aria-label={t("Quick practice")} className="no-scrollbar -mx-4 flex justify-between gap-3 overflow-x-auto px-4 sm:mx-0 sm:justify-start sm:gap-5 sm:px-0">
        {quick.map((q) => (
          <Link key={q.href} href={q.href} className="group flex w-14 shrink-0 flex-col items-center gap-1.5">
            <span className={cx("flex size-14 items-center justify-center rounded-full transition-transform group-hover:scale-105 group-active:scale-95", q.tone)}>
              <q.icon className="size-6" />
            </span>
            <span className="text-xs font-semibold">{t(q.label)}</span>
          </Link>
        ))}
      </nav>

      {sponsor && <SponsorCard s={sponsor} />}

      {/* Score + skills */}
      <Link href="/progress" className="group block">
        <Card className="p-5 transition group-hover:border-line-strong">
          <div className="flex items-center gap-4">
            <ProgressRing value={overall} size={72} stroke={7} label={t("Overall score {0}", overall)}>
              <span className="text-xl font-extrabold tabular-nums">{Math.round(overall)}</span>
            </ProgressRing>
            <div className="min-w-0 flex-1">
              <p className="font-bold">{t("Your skills")}</p>
              <p className="text-sm">
                <span className={cx("font-bold", delta >= 0 ? "text-success" : "text-danger")}>
                  {delta >= 0 ? "+" : ""}
                  {delta}
                </span>{" "}
                <span className="text-muted">{t("since day 1")}</span>
              </p>
            </div>
            <ChevronRight className="size-5 text-muted transition group-hover:translate-x-0.5" />
          </div>
          <div className="mt-4">
            <ScoreBars rows={state.skills} />
          </div>
        </Card>
      </Link>

      {(achievements ?? []).length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold">{t("Badges")}</h2>
            <Link href="/achievements" className="text-sm font-semibold text-primary">{t("See all")}</Link>
          </div>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {(achievements ?? []).map((a) => {
              const def = badgeDefs.get(a.code as string);
              return (
                <div key={a.code} className="flex w-20 shrink-0 flex-col items-center gap-1.5 text-center" title={t(def?.description ?? "")}>
                  <span className="flex size-14 items-center justify-center rounded-full bg-sun text-white shadow-card">
                    <BadgeIcon name={def?.icon ?? "trophy"} className="size-6" />
                  </span>
                  <span className="line-clamp-2 text-[11px] font-semibold leading-tight">{t(def?.title ?? "") ?? a.code}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
