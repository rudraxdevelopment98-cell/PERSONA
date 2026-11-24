import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

/** Shared chrome for a Settings sub-page: a back link to the settings menu + title. */
export function SettingsSub({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/settings" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <ChevronLeft className="size-4" /> {title}
      </Link>
      {description && <p className="mb-4 text-sm text-muted">{description}</p>}
      {children}
    </div>
  );
}
