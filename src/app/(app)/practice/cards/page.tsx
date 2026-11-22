import { ArrowLeft } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { requireUser } from "@/lib/db/server";
import { todayCards } from "@/lib/server/cards";
import { CardDeck } from "./deck";

export const metadata = { title: "Quick cards" };
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function QuickCardsPage() {
  const { user } = await requireUser();
  const view = await todayCards(user.id);
  return (
    <div className="mx-auto max-w-md space-y-4">
      <ButtonLink href="/practice" variant="ghost" className="-ml-2 h-8 px-2">
        <ArrowLeft className="size-4" /> Practice
      </ButtonLink>
      <CardDeck initial={view} />
    </div>
  );
}
