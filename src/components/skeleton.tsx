import { cx } from "./ui";

/** A shimmering placeholder block shown while a page loads. */
export function Skeleton({ className }: { className?: string }) {
  return <span className={cx("block animate-shimmer rounded-lg bg-line/60", className)} aria-hidden />;
}

/** A card-shaped skeleton. */
export function SkeletonCard({ className, lines = 3 }: { className?: string; lines?: number }) {
  return (
    <div className={cx("rounded-3xl border border-line bg-surface p-5", className)}>
      <Skeleton className="h-5 w-1/3" />
      <div className="mt-3 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={cx("h-3.5", i === lines - 1 ? "w-2/3" : "w-full")} />
        ))}
      </div>
    </div>
  );
}

/** A full-page loading state: header + a few cards. */
export function PageSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-7 w-2/5" />
        <Skeleton className="h-4 w-3/5" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: cards }).map((_, i) => (
          <SkeletonCard key={i} lines={i === 0 ? 4 : 2} />
        ))}
      </div>
    </div>
  );
}
