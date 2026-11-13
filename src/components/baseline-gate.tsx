import { ClipboardList } from "lucide-react";
import { ButtonLink, Card, EmptyState } from "./ui";

export function BaselineGate({ feature }: { feature: string }) {
  return (
    <Card>
      <EmptyState
        icon={<ClipboardList className="size-6" strokeWidth={1.5} />}
        title="Start with your initial assessment"
        description={`${feature} is personalised from your baseline. The assessment takes about 10 minutes.`}
        action={<ButtonLink href="/assessment">Take the assessment</ButtonLink>}
      />
    </Card>
  );
}
