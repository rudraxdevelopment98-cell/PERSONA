import { EyeOff, Lock, Sparkles } from "lucide-react";
import { Card, CardHeader, PageHeader, ProgressBar } from "@/components/ui";
import { getUserState } from "@/lib/server/state";
import { getProfile } from "@/lib/server/signals";
import { getT } from "@/lib/i18n/server";
import { ARCHETYPE_INFO, RAW_TEXT_HOURS, type Archetype } from "@/lib/domain/signals";
import { DIMENSION_META, DIMENSIONS } from "@/lib/domain/dimensions";
import { ResetPersona } from "./reset";

export const metadata = { title: "My persona" };

/** Human labels for signal tags (English source; translated through the dictionary). */
const TAG_LABEL: Record<string, string> = {
  family: "Family", friends: "Friends", love: "Love & partner", studies: "Studies", work: "Work", health: "Health", money: "Money", self: "Self", public: "Out in public", online: "Online", other: "Other",
  parent: "Parent", sibling: "Sibling", partner: "Partner", friend: "Friend", relative: "Relative", teacher: "Teacher", boss: "Boss", colleague: "Colleague", classmate: "Classmate", neighbour: "Neighbour", stranger: "Stranger", customer: "Customer", group: "Group",
  anxious: "Anxious", stressed: "Stressed", sad: "Sad", angry: "Angry", frustrated: "Frustrated", lonely: "Lonely", ashamed: "Ashamed", guilty: "Guilty", confused: "Confused", overwhelmed: "Overwhelmed", calm: "Calm", hopeful: "Hopeful", proud: "Proud", happy: "Happy", grateful: "Grateful", motivated: "Motivated",
  conflict: "Conflict", criticism: "Criticism", comparison: "Comparison", rejection: "Rejection", praise: "Praise", deadline: "Deadline", exam: "Exams", money_pressure: "Money pressure", health_worry: "Health worry", speaking_up: "Speaking up", saying_no: "Saying no", big_decision: "Big decision", new_start: "New start", loss: "Loss", expectations: "Expectations", responsibility: "Responsibility", uncertainty: "Uncertainty", achievement: "Achievement", loneliness: "Loneliness", trust: "Trust",
  overthinking: "Overthinking", people_pleasing: "People-pleasing", avoidance: "Avoidance", catastrophising: "Expecting the worst", self_criticism: "Self-criticism", mind_reading: "Mind-reading", all_or_nothing: "All-or-nothing", perfectionism: "Perfectionism", procrastination: "Putting things off", seeking_reassurance: "Seeking reassurance", assertive_action: "Speaking up for yourself", calm_reflection: "Calm reflection", reframing: "Reframing", asking_for_help: "Asking for help", taking_initiative: "Taking initiative", setting_boundary: "Setting boundaries",
  avoidant: "Avoids deciding", impulsive: "Quick, on impulse", dependent: "Asks others first", deliberate: "Careful and slow", balanced: "Balanced",
};

function Chips({ title, tags, label }: { title: string; tags: Record<string, number>; label: (k: string) => string }) {
  const entries = Object.entries(tags);
  if (!entries.length) return null;
  const max = Math.max(...entries.map(([, v]) => v), 0.0001);
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">{title}</p>
      <div className="flex flex-wrap gap-2">
        {entries.map(([k, v]) => (
          <span key={k} className="rounded-full border border-line bg-surface px-3 py-1 text-sm" style={{ opacity: 0.55 + 0.45 * (v / max) }}>
            {label(k)}
          </span>
        ))}
      </div>
    </div>
  );
}

function Meter({ label, value, max, suffix }: { label: string; value: number | null; max: number; suffix?: string }) {
  if (value == null) return null;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-semibold tabular-nums">{suffix ?? `${Math.round(value * 10) / 10}/${max}`}</span>
      </div>
      <ProgressBar value={(value / max) * 100} tone="accent" />
    </div>
  );
}

export default async function PersonaPage() {
  const t = await getT();
  const { user } = await getUserState();
  const p = await getProfile(user.id);
  const label = (k: string) => t(TAG_LABEL[k] ?? k);
  const arch = p?.archetype ? ARCHETYPE_INFO[p.archetype] : null;
  const close = p ? (Object.entries(p.archetype_scores) as [Archetype, number][]).sort((a, b) => b[1] - a[1]).slice(0, 3) : [];
  const moodWord = (m: number) => (m <= -1 ? t("Low") : m < 0.5 ? t("Okay") : t("Good"));

  return (
    <>
      <PageHeader eyebrow={t("Private")} title={t("My persona")} description={t("What the app understands about you, without keeping your words.")} />
      <div className="space-y-4">
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 size-5 shrink-0 text-accent" />
            <div className="space-y-1.5 text-sm leading-relaxed">
              <p className="font-semibold">{t("How your privacy is protected")}</p>
              <p>{t("What you write in check-ins, reflections, labs and coach chats is turned into the tags and numbers below. Your own words are deleted after {0} hours.", RAW_TEXT_HOURS)}</p>
              <p className="flex items-center gap-1.5 text-muted"><EyeOff className="size-4" /> {t("No names, places or quotes are kept. Your journal is never analysed.")}</p>
            </div>
          </div>
        </Card>

        {!p || !p.events ? (
          <Card className="p-6 text-center">
            <Sparkles className="mx-auto mb-2 size-6 text-accent" />
            <p className="font-semibold">{t("Your persona is forming")}</p>
            <p className="mt-1 text-sm text-muted">{t("Do a few check-ins and episodes. Signals appear here within an hour.")}</p>
          </Card>
        ) : (
          <>
            <Card className="p-5">
              {arch ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">{t("Your type right now")}</p>
                  <p className="mt-1 text-2xl font-extrabold">
                    {arch.emoji} {t(arch.name)}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{t(arch.line)}</p>
                </div>
              ) : (
                <p className="text-sm">{t("Your type appears after {0} entries ({1} so far).", 5, p.events)}</p>
              )}
              {close.length > 0 && (
                <div className="mt-4 space-y-2">
                  {close.map(([k, v]) => (
                    <Meter key={k} label={`${ARCHETYPE_INFO[k].emoji} ${t(ARCHETYPE_INFO[k].name)}`} value={v * 100} max={100} suffix={`${Math.round(v * 100)}%`} />
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <CardHeader title={t("Your condition lately")} description={t("From the last few weeks; older entries count less.")} />
              <div className="space-y-3 px-5 pb-5">
                <Meter label={t("Stress")} value={p.stress} max={10} />
                <Meter label={t("Confidence")} value={p.confidence} max={10} />
                {p.mood != null && <Meter label={t("Mood")} value={p.mood + 2} max={4} suffix={moodWord(p.mood)} />}
                {(p.decision_level || p.decision_style) && (
                  <p className="text-sm">
                    {t("Decision level")}: <b>{p.decision_level ? `${p.decision_level}/5` : "–"}</b>
                    {p.decision_style ? ` · ${label(p.decision_style)}` : ""}
                  </p>
                )}
              </div>
            </Card>

            <Card className="space-y-4 p-5">
              <Chips title={t("Patterns")} tags={p.tags.patterns} label={label} />
              <Chips title={t("Situations")} tags={p.tags.themes} label={label} />
              <Chips title={t("Feelings")} tags={p.tags.emotions} label={label} />
              <Chips title={t("Parts of life")} tags={p.tags.areas} label={label} />
              <Chips title={t("People (by role)")} tags={p.tags.roles} label={label} />
            </Card>
          </>
        )}

        {p && Object.keys(p.levels).length > 0 && (
          <Card>
            <CardHeader title={t("Skill levels")} description={t("Level 1-5 from your current scores.")} />
            <div className="grid gap-2 px-5 pb-5 sm:grid-cols-2">
              {DIMENSIONS.filter((d) => p.levels[d]).map((d) => (
                <div key={d} className="flex items-center justify-between gap-3 text-sm">
                  <span>{t(DIMENSION_META[d].label)}</span>
                  <span className="flex gap-1" aria-label={t("Level {0}", p.levels[d]!)}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} className={`size-2.5 rounded-full ${n <= p.levels[d]! ? "bg-accent" : "bg-line"}`} />
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-5">
          <p className="mb-3 text-sm text-muted">{t("You can delete these signals at any time. They rebuild from new activity.")}</p>
          <ResetPersona />
        </Card>
      </div>
    </>
  );
}
