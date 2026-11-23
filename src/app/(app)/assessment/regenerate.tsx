"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Card, EmptyState, Spinner } from "@/components/ui";
import { postJSON } from "@/lib/client/api";
import { useT } from "@/lib/i18n/client";

export function RegenerateProfile() {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Card>
      <EmptyState
        title={t("Your written profile hasn't been generated yet")}
        description={t("Your scores are saved. Generate your personalised profile and roadmap now.")}
        action={
          <div className="space-y-3">
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await postJSON("/api/assessment/profile");
                  router.refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy && <Spinner />} {busy ? t("Generating…") : t("Generate profile")}
            </Button>
            {error && <Alert tone="danger">{t(error)}</Alert>}
          </div>
        }
      />
    </Card>
  );
}
