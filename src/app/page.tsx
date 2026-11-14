import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen, Check, ClipboardCheck, Flame, GitBranch, Languages, LineChart, Mic, PenLine, Sparkles, Target, Trophy, Zap } from "lucide-react";
import { Logo } from "@/components/logo";
import { ButtonLink, IconTile, ProgressRing, cx } from "@/components/ui";
import { PHASES } from "@/lib/domain/programme";
import { getSessionUser } from "@/lib/db/server";

export const dynamic = "force-dynamic";

function PhonePreview() {
  const steps = [
    { label: "Check-in", icon: ClipboardCheck, done: true },
    { label: "Story", icon: BookOpen, done: true },
    { label: "Scenarios", icon: GitBranch, done: false, next: true },
    { label: "Reflect", icon: PenLine, done: false },
    { label: "Challenge", icon: Target, done: false },
  ];
  return (
    <div className="mx-auto w-full max-w-[320px] rounded-[2.5rem] border-[10px] border-ink bg-bg p-3 shadow-raised">
      <div className="rounded-2xl bg-primary p-4 text-white">
        <p className="text-xs text-white/70">Good evening, Aarav</p>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xl font-extrabold">
            Day 12 <span className="text-white/50">/ 90</span>
          </p>
          <ProgressRing value={40} size={56} stroke={6} color="#2dd4bf" track="rgba(255,255,255,0.15)">
            <span className="text-sm font-extrabold">2/5</span>
          </ProgressRing>
        </div>
        <div className="mt-2 flex gap-2 text-[11px] font-bold">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-amber-300">
            <Flame className="size-3" /> 11 days
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-teal-300">
            <Zap className="size-3" /> 640 XP
          </span>
        </div>
      </div>
      <div className="mt-3 rounded-2xl bg-surface p-3">
        <p className="text-xs font-bold">Today&apos;s path</p>
        <div className="mt-2 grid grid-cols-5 gap-1">
          {steps.map((s) => (
            <div key={s.label} className="flex flex-col items-center">
              <span
                className={cx(
                  "flex size-9 items-center justify-center rounded-xl",
                  s.done ? "bg-success text-white" : s.next ? "bg-primary text-white" : "bg-bg text-muted",
                )}
              >
                {s.done ? <Check className="size-4" strokeWidth={3} /> : <s.icon className="size-4" />}
              </span>
              <span className="mt-1 text-[9px] font-semibold text-muted">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-surface p-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-coral text-white">
          <Mic className="size-5" />
        </span>
        <div>
          <p className="text-xs font-bold">Voice practice</p>
          <p className="text-[11px] text-muted">142 wpm · 1 filler word · 82/100</p>
        </div>
      </div>
    </div>
  );
}

export default async function Landing() {
  if (process.env.DATABASE_URL && (await getSessionUser().catch(() => null))) redirect("/dashboard");

  const features = [
    { icon: BookOpen, tone: "sky" as const, title: "A 30-minute daily session", text: "An original story written around your patterns, interactive scenarios, a real-world challenge and a reflection." },
    { icon: Mic, tone: "coral" as const, title: "Speak, don't just type", text: "Practise saying no, disagreeing and handling criticism out loud. Get your pace, filler words and a stronger version." },
    { icon: GitBranch, tone: "accent" as const, title: "Decision Lab", text: "Real dilemmas with trade-offs. Feedback on how you reasoned, the biases you showed and a better way to decide." },
    { icon: Sparkles, tone: "primary" as const, title: "An AI coach who knows you", text: "Practical guidance based on your assessment, recent check-ins and progress - not empty motivation." },
    { icon: Trophy, tone: "sun" as const, title: "Streaks, XP and badges", text: "Level up as you practise. Every point comes from something you actually did." },
    { icon: Languages, tone: "sky" as const, title: "English, Hinglish or Hindi", text: "Stories, questions and feedback in the language you think in." },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <ButtonLink href="/login" variant="ghost">
            Sign in
          </ButtonLink>
          <ButtonLink href="/signup">Get started</ButtonLink>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:py-20">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent">
              <LineChart className="size-3.5" /> 90 days · 30 minutes a day
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Understand yourself.
              <br />
              <span className="text-accent">Challenge</span> yourself.
              <br />
              Become yourself.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              PERSONA 90 builds confidence, communication, decision-making and leadership through daily practice - with honest feedback on how you actually think and speak.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/signup" className="h-12 px-6 text-base">
                Start free <ArrowRight className="size-4" />
              </ButtonLink>
              <ButtonLink href="/login" variant="secondary" className="h-12 px-6 text-base">
                I have an account
              </ButtonLink>
            </div>
          </div>
          <div className="animate-pop">
            <PhonePreview />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-line/80 bg-surface p-6 shadow-card">
                <IconTile tone={f.tone} size="lg">
                  <f.icon className="size-6" />
                </IconTile>
                <h2 className="mt-4 font-bold">{f.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="text-2xl font-extrabold tracking-tight">Three phases, ninety days</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {PHASES.map((p, i) => (
              <div key={p.number} className="relative rounded-2xl bg-primary p-6 text-white" style={{ opacity: 1 - i * 0.08 }}>
                <p className="text-xs font-bold uppercase tracking-wider text-teal-300">
                  Days {p.days[0]}–{p.days[1]}
                </p>
                <h3 className="mt-1 text-lg font-extrabold">{p.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/75">{p.summary}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mx-auto max-w-6xl border-t border-line px-4 py-8 text-xs leading-relaxed text-muted sm:px-6">
          PERSONA 90 is a self-development tool. Scores are development indicators, not clinical or psychometric measurements, and nothing in the app is a diagnosis. If you
          are struggling with your mental health, please speak to a qualified professional.{" "}
          <Link href="/about" className="underline underline-offset-2">
            How scoring and privacy work
          </Link>
        </footer>
      </main>
    </div>
  );
}
