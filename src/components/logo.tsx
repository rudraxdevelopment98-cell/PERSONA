export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-[13px] font-semibold text-white">P</span>
      <span className="text-sm font-semibold tracking-tight text-ink">
        PERSONA <span className="text-muted">90</span>
      </span>
    </span>
  );
}
