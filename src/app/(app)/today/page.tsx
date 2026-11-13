import { BaselineGate } from "@/components/baseline-gate";
import { Badge, PageHeader } from "@/components/ui";
import { DIMENSION_META } from "@/lib/domain/dimensions";
import { getUserState, todaysFocus } from "@/lib/server/state";
import type { CheckinRow, ScenarioResponseRow, SessionRow, StoryRow } from "@/lib/server/types";
import { CheckinFlow } from "./checkin";
import { SessionFlow, type ClientScenario } from "./session";

export const metadata = { title: "Daily Development" };
export const maxDuration = 300;

export default async function TodayPage() {
  const { db, user, state } = await getUserState();
  if (!state.baseline) {
    return (
      <>
        <PageHeader title="Daily Development" />
        <BaselineGate feature="Your daily session" />
      </>
    );
  }

  const focus = todaysFocus(state);
  const [{ data: checkinData }, { data: sessionData }] = await Promise.all([
    db.from("daily_checkins").select("*").eq("user_id", user.id).eq("checkin_date", state.today).maybeSingle(),
    db.from("daily_sessions").select("*").eq("user_id", user.id).eq("day_number", state.day).maybeSingle(),
  ]);
  const checkin = checkinData as CheckinRow | null;
  const session = sessionData as SessionRow | null;

  let story: StoryRow | null = null;
  let responses: ScenarioResponseRow[] = [];
  if (session) {
    const [{ data: s }, { data: r }] = await Promise.all([
      db.from("generated_stories").select("*").eq("session_id", session.id).maybeSingle(),
      db.from("scenario_responses").select("*").eq("session_id", session.id),
    ]);
    story = s as StoryRow | null;
    responses = (r ?? []) as ScenarioResponseRow[];
  }

  // Consequences and quality ratings are only sent once a scenario has been answered.
  const scenarios: ClientScenario[] = (session?.scenarios ?? []).map((sc, index) => {
    const response = responses.find((r) => r.scenario_index === index) ?? null;
    return {
      title: sc.title,
      situation: sc.situation,
      question: sc.question,
      skill: sc.skill,
      options: response ? sc.options : sc.options.map((o) => ({ id: o.id, text: o.text })),
      response: response ? { choice_id: response.choice_id, reasoning: response.reasoning, score: response.score, evaluation: response.evaluation } : null,
    };
  });

  return (
    <>
      <PageHeader
        title="Daily Development"
        description={
          <>
            Day {state.day} · {focus.title} · {DIMENSION_META[focus.dimension].label}
          </>
        }
        action={focus.personalised ? <Badge tone="primary">Personalised to your growth areas</Badge> : undefined}
      />
      {!checkin?.completed_at || !session ? (
        <CheckinFlow checkin={checkin} hasSession={Boolean(session)} />
      ) : (
        <SessionFlow
          session={{
            id: session.id,
            introduction: session.introduction,
            challenge: session.challenge,
            reflection_questions: session.reflection_questions,
            story_progress: session.story_progress,
            story_completed: Boolean(session.story_completed_at),
            scenarios_completed: Boolean(session.scenarios_completed_at),
            challenge_status: session.challenge_status,
            challenge_notes: session.challenge_notes,
            reflection_answers: session.reflection_answers,
            reflection_feedback: session.reflection_feedback,
            completed: Boolean(session.completed_at),
          }}
          story={story ? { title: story.title, body: story.body, word_count: story.word_count, insights: story.insights } : null}
          scenarios={scenarios}
        />
      )}
    </>
  );
}
