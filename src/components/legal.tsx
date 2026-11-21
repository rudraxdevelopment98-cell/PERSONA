import type { ReactNode } from "react";
import { LEGAL_UPDATED, type LegalSettings } from "@/lib/domain/legal";

/** Plain-language summary box shown at the top of each legal page. */
export function InShort({ items }: { items: ReactNode[] }) {
  return (
    <div className="mt-5 rounded-2xl bg-accent-soft p-4">
      <p className="!mt-0 text-sm font-bold">Seedhi baat (in short)</p>
      <ul className="!mt-1">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

export function Updated() {
  return <p className="!mt-1 text-sm text-muted">Last updated {LEGAL_UPDATED}</p>;
}

/** Contact line: the email set in Admin, or the in-app route when none is set yet. */
export function Contact({ legal, grievance = false }: { legal: LegalSettings; grievance?: boolean }) {
  return (
    <>
      {grievance && legal.grievanceName ? `${legal.grievanceName}, Grievance Officer, ${legal.business}` : legal.business}
      {legal.city ? `, ${legal.city}` : ""}.{" "}
      {legal.email ? (
        <>
          Email: <a href={`mailto:${legal.email}`}>{legal.email}</a>
        </>
      ) : (
        <>Write to us from the app: Me → Settings → <a href="/settings#help">Help and contact</a>.</>
      )}
    </>
  );
}
