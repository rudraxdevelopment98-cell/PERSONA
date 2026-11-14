export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative flex size-8 items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-white">
        P<span className="absolute bottom-1.5 right-1.5 size-1.5 rounded-full bg-accent" />
      </span>
      <span className="text-[15px] font-extrabold tracking-tight text-ink">
        PERSONA <span className="text-accent">90</span>
      </span>
    </span>
  );
}
