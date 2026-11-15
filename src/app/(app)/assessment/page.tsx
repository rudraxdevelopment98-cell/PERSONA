import Link from "next/link";
import { Layers } from "lucide-react";
import { UPGRADE_WINDOW_DAYS, isDepth, itemsForDepth } from "@/lib/domain/assessment";
import { depthCopy } from "@/lib/domain/assessment-depth-i18n";
import { upgradeOptions } from "@/lib/server/assessment";
import { DepthPicker } from "./depth-picker";
import { getUserState } from "@/lib/server/state";
import { Card, PageHeader } from "@/components/ui";
import { LanguagePicker } from "@/components/language-picker";
import { AssessmentWizard } from "./wizard";
import { AssessmentResults } from "./results";

export const metadata = { title: "Initial Assessment" };

const INTRO = {
  en: {
    title: "Initial assessment",
    description: "Questions across ten skills, plus a short reflection. Answer based on what you actually do, not what you would like to do. There are no right answers, and your progress is saved as you go.",
  },
  hinglish: {
    title: "Shuruaati assessment",
    description: "10 skills par sawaal, aur ek chhota reflection. Wahi jawab do jo aap asal mein karte ho, na ki jo karna chahte ho. Koi jawab sahi ya galat nahi hai, aur aapka progress har jawab ke saath save hota hai.",
  },
  hi: {
    title: "प्रारंभिक आकलन",
    description: "दस क्षमताओं पर प्रश्न और एक छोटा विचार। वही जवाब दें जो आप वास्तव में करते हैं, न कि जो करना चाहते हैं। कोई जवाब सही या गलत नहीं है, और हर जवाब के साथ आपकी प्रगति सेव होती है।",
  },
} as const;

export default async function AssessmentPage({ searchParams }: { searchParams: Promise<{ deepen?: string }> }) {
  const [{ db, user, state }, sp] = await Promise.all([getUserState(), searchParams]);
  const lang = state.profile.language;
  const t = depthCopy(lang);

  if (state.baseline) {
    const options = upgradeOptions(state);
    const baselineDepth = state.baseline.depth ?? "deep";
    if (isDepth(sp.deepen) && options.includes(sp.deepen)) {
      const { data: responses } = await db.from("assessment_responses").select("question_id, value").eq("assessment_id", state.baseline.id);
      const initial = Object.fromEntries((responses ?? []).map((r) => [r.question_id, r.value]));
      return (
        <>
          <PageHeader title={t.deeperTitle} description={t.deeperText(UPGRADE_WINDOW_DAYS)} />
          <div className="mb-5">
            <LanguagePicker value={lang} />
          </div>
          <AssessmentWizard key={sp.deepen} initial={initial} language={lang} depth={sp.deepen} mode="deepen" askHeldBack={!state.baseline.reflections?.held_back} />
        </>
      );
    }
    const answeredIds = new Set(itemsForDepth(baselineDepth).map((i) => i.id));
    return (
      <>
        <PageHeader
          title="Your development profile"
          description={`Baseline assessment completed on ${new Date(state.baseline.completed_at!).toLocaleDateString("en-GB", { dateStyle: "long" })}. ${t.basedOn(baselineDepth)}`}
        />
        {options.length > 0 && (
          <Card className="mb-6 flex flex-col gap-4 border-primary/30 p-5 sm:flex-row sm:items-center">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Layers className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">{t.deeperTitle}</p>
              <p className="text-sm text-muted">{t.deeperText(UPGRADE_WINDOW_DAYS)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {options.map((d) => (
                <Link
                  key={d}
                  href={`/assessment?deepen=${d}`}
                  className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-card hover:bg-primary-hover"
                >
                  {t.deeperButton(d, itemsForDepth(d).filter((i) => !answeredIds.has(i.id)).length)}
                </Link>
              ))}
            </div>
          </Card>
        )}
        <AssessmentResults scores={state.baseline.scores!} profile={state.profile.development_profile} depth={baselineDepth} />
      </>
    );
  }

  const { data: inProgress } = await db
    .from("assessments")
    .select("id, depth")
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
        title={INTRO[state.profile.language].title}
        description={INTRO[state.profile.language].description}
      />
      <div className="mb-5">
        <LanguagePicker value={state.profile.language} />
      </div>
      {inProgress ? (
        <AssessmentWizard key={inProgress.depth} initial={initial} language={lang} depth={isDepth(inProgress.depth) ? inProgress.depth : "deep"} />
      ) : (
        <DepthPicker language={lang} />
      )}
    </>
  );
}
