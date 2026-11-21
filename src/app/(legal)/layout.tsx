import Link from "next/link";
import { Logo } from "@/components/logo";

const DOCS = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refund", label: "Refunds" },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/">
          <Logo />
        </Link>
        <nav className="flex gap-1 rounded-full bg-surface p-1 text-sm font-semibold" aria-label="Legal documents">
          {DOCS.map((d) => (
            <Link key={d.href} href={d.href} className="rounded-full px-3 py-1.5 text-muted hover:bg-bg hover:text-ink">
              {d.label}
            </Link>
          ))}
        </nav>
      </div>
      <article className="legal mt-8">{children}</article>
      <p className="mt-12 border-t border-line pt-6 text-xs text-muted">
        PERSONA 90 is a self-development tool, not medical or psychological care. In India, for free mental-health support call Tele-MANAS on 14416.
      </p>
    </div>
  );
}
