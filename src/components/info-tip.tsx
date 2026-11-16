"use client";

import { Info } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/** A small ⓘ that reveals extra help on tap or hover, instead of a paragraph on the page. */
export function InfoTip({ children, label = "More info" }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex align-middle" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
        className="rounded-full p-1 text-muted/70 transition-colors hover:text-ink"
      >
        <Info className="size-4" />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="animate-pop absolute left-1/2 top-full z-50 mt-1 w-64 -translate-x-1/2 rounded-2xl border border-line bg-surface p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-muted shadow-raised sm:left-0 sm:translate-x-0"
        >
          {children}
        </span>
      )}
    </span>
  );
}
