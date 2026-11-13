import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 h-9 px-3.5 whitespace-nowrap";
const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  secondary: "border border-line bg-surface text-ink hover:bg-bg",
  ghost: "text-muted hover:bg-primary-soft hover:text-ink",
  danger: "border border-danger/30 bg-surface text-danger hover:bg-danger-soft",
};

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button className={cx(buttonBase, buttonVariants[variant], className)} {...props} />;
}

export function ButtonLink({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={cx(buttonBase, buttonVariants[variant], className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("rounded-lg border border-line bg-surface shadow-card", className)} {...props} />;
}

export function CardHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "primary" | "success" | "warning" | "danger"; children: ReactNode }) {
  const tones = {
    neutral: "bg-bg text-muted border-line",
    primary: "bg-primary-soft text-primary border-primary/10",
    success: "bg-success-soft text-success border-success/15",
    warning: "bg-warning-soft text-warning border-warning/15",
    danger: "bg-danger-soft text-danger border-danger/15",
  };
  return <span className={cx("inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cx("mb-1.5 block text-sm font-medium text-ink", className)} {...props} />;
}

const fieldBase =
  "w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/10 disabled:bg-bg";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(fieldBase, "h-9", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cx(fieldBase, "min-h-24 leading-relaxed", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cx(fieldBase, "h-9", className)} {...props} />;
}

export function Alert({ tone = "neutral", children }: { tone?: "neutral" | "danger" | "success" | "warning"; children: ReactNode }) {
  const tones = {
    neutral: "border-line bg-bg text-ink",
    danger: "border-danger/20 bg-danger-soft text-danger",
    success: "border-success/20 bg-success-soft text-success",
    warning: "border-warning/20 bg-warning-soft text-warning",
  };
  return <div role={tone === "danger" ? "alert" : "status"} className={cx("rounded-md border px-3.5 py-2.5 text-sm", tones[tone])}>{children}</div>;
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cx("h-1.5 w-full overflow-hidden rounded-full bg-primary-soft", className)} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${v}%` }} />
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="mb-3 text-muted">{icon}</div>}
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cx("inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent", className)} aria-hidden />;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Delta({ value }: { value: number }) {
  const v = Math.round(value * 10) / 10;
  if (v === 0) return <span className="text-xs text-muted tabular-nums">±0</span>;
  return <span className={cx("text-xs font-medium tabular-nums", v > 0 ? "text-success" : "text-danger")}>{v > 0 ? `+${v}` : v}</span>;
}
