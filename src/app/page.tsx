import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen, Check, ClipboardCheck, Flame, GitBranch, Layers, Leaf, LineChart, Lock, Mic, PenLine, Target, Users, Vote, Zap } from "lucide-react";
import { Logo } from "@/components/logo";
import { ButtonLink, IconTile, ProgressRing, cx } from "@/components/ui";
import { PHASES } from "@/lib/domain/programme";
import { getSessionUser } from "@/lib/db/server";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

async function PhonePreview() {
  const t = await getT();
  const steps = [
    { label: "Check-in", icon: ClipboardCheck, done: true },
    { label: "Story", icon: BookOpen, done: true },
    { label: "Scenarios", icon: GitBranch, done: false, next: true },
    { label: "Reflect", icon: PenLine, done: false },
    { label: "Challenge", icon: Target, done: false },
  ];
  return (
    <div className="mx-auto w-full max-w-[320px] rounded-[2.5rem] border-[10px] border-ink bg-bg p-3 shadow-raised">
      <div className="bg-brand rounded-2xl p-4 text-white">
        <p className="text-xs text-white/70">{t("Good evening, Aarav")}</p>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xl font-extrabold">{t("Day 12")}{" "}<span className="text-white/50">/ 90</span>
          </p>
          <ProgressRing value={40} size={56} stroke={6} color="#ffffff" track="rgba(255,255,255,0.2)">
            <span className="text-sm font-extrabold">2/5</span>
          </ProgressRing>
        </div>
        <div className="mt-2 flex gap-2 text-[11px] font-bold">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-teal-200">
            <Flame className="size-3" />{" "}{t("11 days")}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-white">
            <Zap className="size-3" />{" "}{t("640 XP")}</span>
        </div>
      </div>
      <div className="mt-3 rounded-2xl bg-surface p-3">
        <p className="text-xs font-bold">{t("Today's path")}</p>
        <div className="mt-2 grid grid-cols-5 gap-1">
          {steps.map((s) => (
            <div key={s.label} className="flex flex-col items-center">
              <span
                className={cx(
                  "flex size-9 items-center justify-center rounded-xl",
                  s.done ? "bg-success text-white" : s.next ? "bg-brand text-white" : "bg-bg text-muted",
                )}
              >
                {s.done ? <Check className="size-4" strokeWidth={3} /> : <s.icon className="size-4" />}
              </span>
              <span className="mt-1 text-[9px] font-semibold text-muted">{t(s.label)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-surface p-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-coral text-white">
          <Mic className="size-5" />
        </span>
        <div>
          <p className="text-xs font-bold">{t("Voice practice")}</p>
          <p className="text-[11px] text-muted">{t("142 wpm · 1 filler word · 82/100")}</p>
        </div>
      </div>
    </div>
  );
}

export default async function Landing() {
  const t = await getT();
  if (process.env.DATABASE_URL && (await getSessionUser().catch(() => null))) redirect("/dashboard");

  const features = [
    { icon: BookOpen, tone: "primary" as const, title: "Interactive kahani", text: "Roz ek naya episode. Turning point par faisla tum karte ho." },
    { icon: Layers, tone: "accent" as const, title: "Quick cards", text: "5 situations, 1 minute. Sahi move kya hota, turant dekho." },
    { icon: Vote, tone: "accent" as const, title: "Aaj ka sawaal", text: "10 second ka poll. Dekho baaki log aur tumhare dost kya karte." },
    { icon: Users, tone: "primary" as const, title: "Dost aur friend streak", text: "Saath mein streak, moments, cheers aur races." },
    { icon: Mic, tone: "primary" as const, title: "Bol ke practice", text: "Mushkil baatein out loud practice karo, AI feedback ke saath." },
    { icon: Leaf, tone: "accent" as const, title: "Calm Corner", text: "Stress ho to 2 minute: saans, vent & burn, sounds." },
  ];
  const loop = [
    { icon: ClipboardCheck, time: "2 min", title: "Check-in", text: "Mood aur din kaisa gaya, game jaise cards mein." },
    { icon: BookOpen, time: "10 min", title: "Episode", text: "Kahani tumhari skill par, faisla tumhara." },
    { icon: GitBranch, time: "10 min", title: "Practice", text: "Scenarios, feedback aur aaj ka real-life challenge." },
    { icon: PenLine, time: "3 min", title: "Reflect", text: "Kya seekha, kal kya alag karoge." },
  ];
  const faqs = [
    { q: "Kya ye free hai?", a: "Haan. Free plan mein roz check-in, streak, poll aur quick cards; pehle hafte roz poora episode, phir hafte mein 3. Pro mein roz naya episode aur AI narrator. Card ke bina 7 din Pro try kar sakte ho." },
    { q: "Kya ye sirf job walon ke liye hai?", a: "Nahi. Student, job, apna business, ghar sambhalne wale ya kaam dhoondhne wale, sab ke liye. Tum batate ho ki life ke kaun se hisse (family, dost, rishte, padhai, kaam, health, paisa) mein grow karna hai, aur kahaniyan wahi se aati hain." },
    { q: "Roz kitna time chahiye?", a: "Poora session ~30 minute. Busy din par sirf 2 minute ka check-in bhi streak bachata hai." },
    { q: "Hindi, Hinglish ya Gujarati mein milega?", a: "Haan: English, Hinglish, हिन्दी aur ગુજરાતી. Settings mein bhasha chuno; kahaniyan, sawaal, awaaz aur Gujarati mein poora app bhi." },
    { q: "Mera data safe hai?", a: "Journal, jawab aur coach chats sirf tumhare hain. Dost sirf wahi dekhte hain jo tum share karo. Data kabhi bhi download ya delete kar sakte ho." },
    { q: "Kya ye therapy hai?", a: "Nahi. Ye self-development ke liye hai, diagnosis ya ilaaj nahi. Mushkil waqt mein professional se baat karo; India mein Tele-MANAS 14416." },
    { q: "App kahan milega?", a: "Abhi browser mein kholo aur \"Install\" dabao, phone par app jaisa chalega. Play Store app jaldi." },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <ButtonLink href="/login" variant="ghost">{t("Sign in")}</ButtonLink>
          <ButtonLink href="/signup">{t("Get started")}</ButtonLink>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:py-20">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent">
              <LineChart className="size-3.5" />{" "}{t("90 din · 30 minute roz · free")}</span>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">{t("Roz ek kahani.")}<br />
              <span className="text-accent">{t("Faisla")}</span>{" "}{t("tumhara.")}</h1>
            <p className="mt-5 max-w-md text-lg text-muted">{t("Confidence, baat-cheet aur faisle lene ki skill: ghar, dost, padhai, kaam aur rishton mein. Interactive kahaniyon aur roz ki chhoti practice se. English, Hinglish, हिन्दी ya ગુજરાતી.")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/signup" className="h-12 px-6 text-base">{t("Free shuru karo")}{" "}<ArrowRight className="size-4" />
              </ButtonLink>
              <ButtonLink href="/login" variant="secondary" className="h-12 px-6 text-base">{t("Mera account hai")}</ButtonLink>
            </div>
            <p className="mt-3 text-xs text-muted">{t("2 minute mein shuru · card nahi chahiye · kabhi bhi data delete")}</p>
          </div>
          <div className="animate-pop">
            <PhonePreview />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-labelledby="loop-title">
          <h2 id="loop-title" className="text-2xl font-extrabold tracking-tight">{t("Roz ke 30 minute, aise")}</h2>
          <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {loop.map((l, i) => (
              <li key={l.title} className="rounded-3xl border border-line/70 bg-surface p-5">
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-white">
                    <l.icon className="size-5" />
                  </span>
                  <span className="text-xs font-bold text-muted">
                    {i + 1} · {t(l.time)}
                  </span>
                </div>
                <h3 className="mt-3 font-bold">{t(l.title)}</h3>
                <p className="mt-1 text-sm text-muted">{l.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-sm text-muted">{t("Din mein kabhi bhi:")}{" "}<b className="text-ink">{t("Aaj ka sawaal")}</b>{" "}{t("(10 sec),")}{" "}<b className="text-ink">{t("Quick cards")}</b>{" "}{t("(1 min), dosto ke")}{" "}<b className="text-ink">{t("moments")}</b>.
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-3xl border border-line/70 bg-surface p-6 transition hover:-translate-y-1 hover:shadow-raised">
                <IconTile tone={f.tone} size="lg">
                  <f.icon className="size-6" />
                </IconTile>
                <h2 className="mt-4 font-bold">{t(f.title)}</h2>
                <p className="mt-1 text-sm text-muted">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="text-2xl font-extrabold tracking-tight">{t("Teen phase, 90 din")}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {PHASES.map((p, i) => (
              <div key={p.number} className="bg-brand relative rounded-3xl p-6 text-white" style={{ opacity: 1 - i * 0.08 }}>
                <p className="text-xs font-bold uppercase tracking-wider text-white/70">{t("Days {0}–{1}", p.days[0], p.days[1])}</p>
                <h3 className="mt-1 text-lg font-extrabold">{p.name}</h3>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="grid gap-6 rounded-3xl border border-line/70 bg-surface p-6 sm:grid-cols-[auto_1fr] sm:p-8">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <Lock className="size-6" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">{t("Tumhari baatein, sirf tumhari")}</h2>
              <ul className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
                {["Journal aur jawab kisi ko nahi dikhte", "Dost sirf wahi dekhte jo tum share karo", "Hum data bechte nahi, ads ke liye use nahi", "Kabhi bhi poora data download ya delete"].map((it) => (
                  <li key={it} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={3} /> {t(it)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6" aria-labelledby="faq-title">
          <h2 id="faq-title" className="text-2xl font-extrabold tracking-tight">{t("Aksar puche jaane wale sawaal")}</h2>
          <div className="mt-5 divide-y divide-line rounded-3xl border border-line/70 bg-surface">
            {faqs.map((f) => (
              <details key={f.q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
                  {t(f.q)}
                  <span className="text-muted transition group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t(f.a)}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-14 pt-4 sm:px-6">
          <div className="bg-brand rounded-[32px] p-8 text-center text-white sm:p-12">
            <h2 className="text-3xl font-extrabold tracking-tight">{t("Aaj se shuru karo. Day 1 sirf 10 minute ka.")}</h2>
            <p className="mx-auto mt-3 max-w-md text-white/75">{t("Quick check, pehli kahani, aur tumhara pehla faisla.")}</p>
            <ButtonLink href="/signup" variant="secondary" className="mt-6 h-12 px-6 text-base">{t("Free shuru karo")}{" "}<ArrowRight className="size-4" />
            </ButtonLink>
          </div>
        </section>

        <footer className="mx-auto max-w-6xl border-t border-line px-4 py-8 text-xs leading-relaxed text-muted sm:px-6">{t("A self-development tool, not a diagnosis. If you are struggling, please speak to a professional.")}{" "}
          <Link href="/about" className="underline underline-offset-2">{t("How scoring and privacy work")}</Link>
          {" · "}
          <Link href="/terms" className="underline underline-offset-2">{t("Terms")}</Link>
          {" · "}
          <Link href="/privacy" className="underline underline-offset-2">{t("Privacy")}</Link>
          {" · "}
          <Link href="/refund" className="underline underline-offset-2">{t("Refunds")}</Link>
        </footer>
      </main>
    </div>
  );
}
