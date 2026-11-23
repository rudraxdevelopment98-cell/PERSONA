"use client";

import { ClipboardList } from "lucide-react";
import { ButtonLink, Card, EmptyState } from "./ui";
import { useT } from "@/lib/i18n/client";

export function BaselineGate({ feature }: { feature: string }) {
  const t = useT();
  return (
    <Card>
      <EmptyState
        icon={<ClipboardList className="size-6" strokeWidth={1.5} />}
        title={t("Start with your initial assessment")}
        description={t("{0} is personalised from your baseline. The assessment takes about 10 minutes.", t(feature))}
        action={<ButtonLink href="/assessment">{t("Take the assessment")}</ButtonLink>}
      />
    </Card>
  );
}
