"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Card, EmptyState, Spinner } from "@/components/ui";
import { postJSON } from "@/lib/client/api";

export function RegenerateProfile() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Card>
      <EmptyState
        title="Your written profile hasn't been generated yet"
        description="Your scores are saved. Generate your personalised profile and roadmap now."
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
              {busy && <Spinner />} {busy ? "Generating…" : "Generate profile"}
            </Button>
            {error && <Alert tone="danger">{error}</Alert>}
          </div>
        }
      />
    </Card>
  );
}
