"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { RecoveryCodes } from "@/components/recovery-codes";
import { Alert, ButtonLink, Spinner } from "@/components/ui";
import { getInitialCodes } from "./actions";
import { useT } from "@/lib/i18n/client";

/** Requests the first codes once from the browser, so a double page load can never create two sets. */
export function WelcomeCodes({ email }: { email: string }) {
  const t = useT();
  const [codes, setCodes] = useState<string[] | null | undefined>(undefined);
  const asked = useRef(false);
  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    getInitialCodes()
      .then((r) => setCodes(r.codes))
      .catch(() => setCodes(null));
  }, []);

  return (
    <>
      <div className="mt-5">
        {codes === undefined ? (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Spinner />{" "}{t("Creating your codes…")}</p>
        ) : codes ? (
          <RecoveryCodes codes={codes} email={email} />
        ) : (
          <Alert tone="warning">{t("Your codes were already created. You can make a new set any time in Settings → Recovery codes.")}</Alert>
        )}
      </div>
      <p className="mt-4 text-sm text-muted">{t("Tip: also set two backup security questions in")}{" "}<span className="font-semibold text-ink">{t("Settings → Backup security questions")}</span>{t(", in case you lose these codes.")}</p>
      <ButtonLink href="/welcome/profile" className="mt-6">{t("I've saved them - continue")}{" "}<ArrowRight className="size-4" />
      </ButtonLink>
    </>
  );
}
