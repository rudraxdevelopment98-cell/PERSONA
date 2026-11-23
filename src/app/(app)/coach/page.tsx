import { UsageChip } from "@/components/upgrade";
import { getPlan, usage } from "@/lib/server/plan";
import { FREE_LIMITS } from "@/lib/domain/plans";
import Link from "next/link";
import { BaselineGate } from "@/components/baseline-gate";
import { PageHeader } from "@/components/ui";
import { getUserState } from "@/lib/server/state";
import { CoachChat } from "./chat";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "AI Coach" };

export default async function CoachPage() {
  const t = await getT();
  const { db, user, state } = await getUserState();
  const [plan, used] = await Promise.all([getPlan(user.id), usage(user.id)]);
  const chip = plan.unlimitedAI ? null : <UsageChip used={used.coachToday} limit={FREE_LIMITS.coachPerDay} period="day" />;
  const header = (
    <PageHeader
      action={chip}
      title={t("AI Coach")}
      description={
        <>{t("Practical guidance. Not a therapist.")}{" "}
          <Link href="/guide#coach" className="underline underline-offset-2">{t("How it works")}</Link></>
      }
    />
  );
  if (!state.baseline) return (<>{header}<BaselineGate feature="Your coach" /></>);

  const { data } = await db.from("coach_messages").select("id, role, content").eq("user_id", user.id).order("created_at", { ascending: false }).limit(60);
  const history = (data ?? []).reverse() as { id: string; role: "user" | "assistant"; content: string }[];

  return (
    <>
      {header}
      <CoachChat initial={history} askLearning={state.profile.learn_from_coach == null} />
    </>
  );
}
