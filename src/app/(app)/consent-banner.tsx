"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ShieldCheck } from "lucide-react";
import { Alert, Button } from "@/components/ui";

/** One-time agreement for people who joined before the Terms and Privacy Policy were published (or after a change). */
export function ConsentBanner() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <section aria-label="Terms and privacy" className="mb-5 rounded-3xl border border-line bg-surface p-4 shadow-raised">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <ShieldCheck className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">Our Terms and Privacy Policy</p>
          <p className="mt-0.5 text-sm text-muted">
            Please read how we handle your data and agree to continue. You can export or delete your data any time in Settings.
          </p>
          <label className="mt-3 flex items-start gap-2 text-sm">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-accent)]" />
            <span>
              I am 18 or older and I agree to the{" "}
              <Link href="/terms" target="_blank" className="font-semibold text-accent underline">Terms</Link> and{" "}
              <Link href="/privacy" target="_blank" className="font-semibold text-accent underline">Privacy Policy</Link>.
            </span>
          </label>
          {error && <div className="mt-2"><Alert tone="danger">{error}</Alert></div>}
          <Button
            className="mt-3"
            disabled={!checked || pending}
            onClick={() =>
              start(async () => {
                const r = await fetch("/api/consent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ agree: true }) });
                if (!r.ok) return setError("Could not save. Please try again.");
                router.refresh();
              })
            }
          >
            {pending ? "Saving…" : "Agree and continue"}
          </Button>
        </div>
      </div>
    </section>
  );
}
