import Link from "next/link";
import { Logo } from "@/components/logo";
import { DIMENSION_META, DIMENSIONS } from "@/lib/domain/dimensions";
import { WEIGHTS } from "@/lib/domain/scoring";

export const metadata = { title: "How it works" };

export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/"><Logo /></Link>
      <h1 className="mt-10 text-2xl font-semibold tracking-tight">How scoring and privacy work</h1>

      <section className="mt-8 space-y-3 text-sm leading-relaxed">
        <h2 className="text-base font-semibold">What is measured</h2>
        <ul className="space-y-1.5">
          {DIMENSIONS.map((d) => (
            <li key={d}><span className="font-medium">{DIMENSION_META[d].label}</span> - <span className="text-muted">{DIMENSION_META[d].description}</span></li>
          ))}
        </ul>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-muted">
        <h2 className="text-base font-semibold text-ink">How scores are calculated</h2>
        <p>
          Your baseline comes from a 40-item questionnaire with a published rubric: each answer scores 1–5 (some items reversed), and each dimension&apos;s
          average is rescaled to 0–100. After that, each score blends self-reported behaviour ({WEIGHTS.self * 100}%) with demonstrated performance in
          scenarios and labs ({WEIGHTS.demonstrated * 100}%). Consistency of practice is tracked as its own category and also feeds your
          self-discipline score from day 7. AI evaluations use fixed
          four-part rubrics so scores are consistent and explainable, and every change is logged with its reason.
        </p>
        <p>
          Scores are self-development indicators. They are not clinical or psychometric measurements, and PERSONA 90 never diagnoses any psychological or
          medical condition. If you are struggling, please contact a qualified professional or local emergency services.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-muted">
        <h2 className="text-base font-semibold text-ink">Privacy</h2>
        <p>
          Your data is stored in a database protected by row-level security: every record is tied to your account and can only be read by you. Your journal
          is private, including from the AI Coach unless you choose otherwise. Content is sent to the AI provider only to generate your sessions and
          feedback. You can export or permanently delete everything from Settings.
        </p>
      </section>
    </div>
  );
}
