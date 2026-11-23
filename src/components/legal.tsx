"use client";

import type { ReactNode } from "react";
import { LEGAL_UPDATED, type LegalSettings } from "@/lib/domain/legal";
import { useT } from "@/lib/i18n/client";

/** Plain-language summary box shown at the top of each legal page. */
export function InShort({ items }: { items: ReactNode[] }) {
  const t = useT();
  return (
    <div className="mt-5 rounded-2xl bg-accent-soft p-4">
      <p className="!mt-0 text-sm font-bold">{t("Seedhi baat (in short)")}</p>
      <ul className="!mt-1">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

export function Updated() {
  const t = useT();
  return <p className="!mt-1 text-sm text-muted">{t("Last updated {0}", LEGAL_UPDATED)}</p>;
}

/** Contact line: the email set in Admin, or the in-app route when none is set yet. */
export function Contact({ legal, grievance = false }: { legal: LegalSettings; grievance?: boolean }) {
  const t = useT();
  return (
    <>
      {grievance && legal.grievanceName ? t("{0}, Grievance Officer, {1}", legal.grievanceName, legal.business) : t(legal.business)}
      {legal.city ? `, ${legal.city}` : ""}.{" "}
      {legal.email ? (
        <>{t("Email:")}{" "}<a href={`mailto:${legal.email}`}>{legal.email}</a>
        </>
      ) : (
        <>{t("Write to us from the app: Me → Settings →")}{" "}<a href="/settings#help">{t("Help and contact")}</a>.</>
      )}
    </>
  );
}
