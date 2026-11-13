import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen, GitBranch, LineChart, MessageSquare } from "lucide-react";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui";
import { PHASES } from "@/lib/domain/programme";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Landing() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/dashboard");
  }

  const features = [
    { icon: BookOpen, title: "A 30-minute daily session", text: "An original story, interactive scenarios, a real-world challenge and a reflection, built from your own check-in answers." },
    { icon: GitBranch, title: "Decision and communication labs", text: "Practise decisions and difficult conversations. Feedback looks at how you reasoned, not just what you chose." },
    { icon: MessageSquare, title: "A coach who knows your history", text: "Practical guidance based on your assessment, your recent patterns and your progress." },
    { icon: LineChart, title: "Honest progress measurement", text: "Scores from 0 to 100 built on what you report, what you demonstrate and how consistently you practise." },
  ];

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <ButtonLink href="/login" variant="ghost">Sign in</ButtonLink>
          <ButtonLink href="/signup">Get started</ButtonLink>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6">
        <section className="py-16 sm:py-24">
          <p className="text-sm font-medium text-muted">A 90-day personal development programme</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
            Understand yourself. Challenge yourself. Become yourself.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted">
            PERSONA 90 helps you build confidence, communication, decision-making, emotional intelligence, independent thinking and leadership
            through deliberate daily practice and honest feedback.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/signup" className="h-10 px-5">
              Start your assessment <ArrowRight className="size-4" />
            </ButtonLink>
            <ButtonLink href="/login" variant="secondary" className="h-10 px-5">I have an account</ButtonLink>
          </div>
        </section>

        <section className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="bg-surface p-6">
              <f.icon className="size-5 text-primary" strokeWidth={1.5} />
              <h2 className="mt-4 text-sm font-semibold">{f.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.text}</p>
            </div>
          ))}
        </section>

        <section className="py-16">
          <h2 className="text-lg font-semibold">Three phases, ninety days</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {PHASES.map((p) => (
              <div key={p.number} className="rounded-lg border border-line bg-surface p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Days {p.days[0]}–{p.days[1]}</p>
                <h3 className="mt-1 font-semibold">{p.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{p.summary}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-line py-8 text-xs leading-relaxed text-muted">
          PERSONA 90 is a self-development tool. Scores are development indicators, not clinical or psychometric measurements, and nothing in the
          app is a diagnosis. If you are struggling with your mental health, please speak to a qualified professional.{" "}
          <Link href="/about" className="underline underline-offset-2">How scoring and privacy work</Link>
        </footer>
      </main>
    </div>
  );
}
