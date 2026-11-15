import { UsageChip } from "@/components/upgrade";
import { getPlan, usage } from "@/lib/server/plan";
import { FREE_LIMITS } from "@/lib/domain/plans";
import Link from "next/link";
import { BaselineGate } from "@/components/baseline-gate";
import { PageHeader } from "@/components/ui";
import { getUserState } from "@/lib/server/state";
import { CoachChat } from "./chat";

export const metadata = { title: "AI Coach" };

export default async function CoachPage() {
  const { db, user, state } = await getUserState();
  const [plan, used] = await Promise.all([getPlan(user.id), usage(user.id)]);
  const chip = plan.unlimitedAI ? null : <UsageChip used={used.coachToday} limit={FREE_LIMITS.coachPerDay} period="day" />;
  const header = (
    <PageHeader
      action={chip}
      title="AI Coach"
      description={
        <>
          Practical guidance based on your assessment, check-ins and practice results.{" "}
          {state.profile.coach_journal_access ? "Your coach can read your five most recent journal entries." : "Your journal stays private from the coach"}
          {" "}(<Link href="/settings" className="underline underline-offset-2">change</Link>). The coach is not a therapist and does not diagnose.
        </>
      }
    />
  );
  if (!state.baseline) return (<>{header}<BaselineGate feature="Your coach" /></>);

  const { data } = await db.from("coach_messages").select("id, role, content").eq("user_id", user.id).order("created_at", { ascending: false }).limit(60);
  const history = (data ?? []).reverse() as { id: string; role: "user" | "assistant"; content: string }[];

  return (
    <>
      {header}
      <CoachChat initial={history} />
    </>
  );
}
