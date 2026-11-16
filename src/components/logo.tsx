export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap ${className}`}>
      <span className="relative flex size-8 items-center justify-center bg-brand rounded-xl text-sm font-extrabold text-white">
        P
      </span>
      <span className="text-[15px] font-extrabold tracking-tight text-ink">
        PERSONA <span className="text-brand">90</span>
      </span>
    </span>
  );
}
