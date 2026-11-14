import { ASSESSMENT_ITEMS } from "@/lib/domain/assessment";
import { getUserState } from "@/lib/server/state";
import { PageHeader } from "@/components/ui";
import { LanguagePicker } from "@/components/language-picker";
import { AssessmentWizard } from "./wizard";
import { AssessmentResults } from "./results";

export const metadata = { title: "Initial Assessment" };

export default async function AssessmentPage() {
  const { db, user, state } = await getUserState();

  if (state.baseline) {
    return (
      <>
        <PageHeader
          title="Your development profile"
          description={`Baseline assessment completed on ${new Date(state.baseline.completed_at!).toLocaleDateString("en-GB", { dateStyle: "long" })}.`}
        />
        <AssessmentResults scores={state.baseline.scores!} profile={state.profile.development_profile} />
      </>
    );
  }

  const { data: inProgress } = await db
    .from("assessments")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: responses } = inProgress
    ? await db.from("assessment_responses").select("question_id, value").eq("assessment_id", inProgress.id)
    : { data: [] };
  const initial = Object.fromEntries((responses ?? []).map((r) => [r.question_id, r.value]));

  return (
    <>
      <PageHeader
        title="Initial assessment"
        description={`${ASSESSMENT_ITEMS.length} questions across ten dimensions, plus two short reflections. Answer based on what you actually do, not what you would like to do. There are no right answers, and your progress is saved as you go.`}
      />
      <div className="mb-5">
        <LanguagePicker value={state.profile.language} />
      </div>
      <AssessmentWizard initial={initial} />
    </>
  );
}
