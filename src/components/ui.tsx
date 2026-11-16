import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { InfoTip } from "./info-tip";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "accent";
const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 h-10 px-4 whitespace-nowrap";
const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  accent: "bg-accent text-white hover:brightness-95",
  secondary: "bg-primary-soft text-ink hover:brightness-95",
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
  // A background passed in className replaces the default surface colour.
  const customBg = /(^|\s)bg-/.test(className ?? "");
  return <div className={cx("rounded-3xl border border-line/70 shadow-card", !customBg && "bg-surface", className)} {...props} />;
}

export function CardHeader({ title, description, action, icon }: { title: ReactNode; description?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pb-1 pt-5">
      <div className="flex min-w-0 items-start gap-3">
        {icon}
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-ink">{title}</h2>
          {description && <p className="mt-0.5 line-clamp-1 text-xs text-muted">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, action, eyebrow }: { title: string; description?: ReactNode; action?: ReactNode; eyebrow?: ReactNode }) {
  // Help text lives behind an ⓘ so pages open on content, not instructions.
  return (
    <div className="mb-5 flex items-center justify-between gap-3 sm:mb-7">
      <div className="min-w-0">
        {eyebrow && <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-muted">{eyebrow}</p>}
        <h1 className="flex items-center gap-1 text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">
          <span className="truncate">{title}</span>
          {description && <InfoTip label={`About ${title}`}>{description}</InfoTip>}
        </h1>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "accent" | "sun" | "coral" | "sky";
const toneClasses: Record<Tone, string> = {
  neutral: "bg-bg text-muted",
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  accent: "bg-accent-soft text-accent",
  sun: "bg-sun-soft text-warning",
  coral: "bg-coral-soft text-coral",
  sky: "bg-sky-soft text-sky",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", toneClasses[tone])}>{children}</span>;
}

/** Rounded coloured square holding a line icon. */
export function IconTile({ tone = "primary", children, size = "md" }: { tone?: Tone; children: ReactNode; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "size-8 rounded-lg", md: "size-10 rounded-xl", lg: "size-12 rounded-2xl" };
  return <span className={cx("flex shrink-0 items-center justify-center", sizes[size], toneClasses[tone])}>{children}</span>;
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cx("mb-1.5 block text-sm font-semibold text-ink", className)} {...props} />;
}

const fieldBase =
  "w-full rounded-2xl border border-line bg-bg px-4 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-primary/50 focus:bg-surface focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:opacity-60";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(fieldBase, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cx(fieldBase, "min-h-24 leading-relaxed", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cx(fieldBase, "h-10 py-0", className)} {...props} />;
}

export function Alert({ tone = "neutral", children }: { tone?: "neutral" | "danger" | "success" | "warning"; children: ReactNode }) {
  const tones = {
    neutral: "border-line bg-bg text-ink",
    danger: "border-danger/20 bg-danger-soft text-danger",
    success: "border-success/20 bg-success-soft text-success",
    warning: "border-warning/20 bg-warning-soft text-warning",
  };
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("rounded-xl border px-3.5 py-2.5 text-sm", tones[tone])}>
      {children}
    </div>
  );
}

export function ProgressBar({ value, className, tone = "primary" }: { value: number; className?: string; tone?: "primary" | "accent" | "sun" }) {
  const v = Math.max(0, Math.min(100, value));
  const fill = { primary: "bg-primary", accent: "bg-accent", sun: "bg-sun" }[tone];
  return (
    <div className={cx("h-2 w-full overflow-hidden rounded-full bg-primary-soft", className)} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx("h-full rounded-full transition-[width] duration-700", fill)} style={{ width: `${v}%` }} />
    </div>
  );
}

/** Circular progress (0-100) with optional centred content. */
export function ProgressRing({
  value,
  size = 72,
  stroke = 8,
  color = "var(--color-accent)",
  track = "var(--color-primary-soft)",
  children,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
  label?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(v)}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="mb-3 text-muted">{icon}</div>}
      <p className="text-sm font-bold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-muted">{description}</p>}
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
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Delta({ value }: { value: number }) {
  const v = Math.round(value * 10) / 10;
  if (v === 0) return <span className="text-xs tabular-nums text-muted">±0</span>;
  return <span className={cx("text-xs font-bold tabular-nums", v > 0 ? "text-success" : "text-danger")}>{v > 0 ? `+${v}` : v}</span>;
}
