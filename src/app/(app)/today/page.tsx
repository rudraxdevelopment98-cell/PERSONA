import { BaselineGate } from "@/components/baseline-gate";
import { Badge, PageHeader } from "@/components/ui";
import { DIMENSION_META } from "@/lib/domain/dimensions";
import { getUserState, todaysFocus } from "@/lib/server/state";
import type { CheckinRow, ScenarioResponseRow, SessionRow, StoryRow } from "@/lib/server/types";
import { CheckinFlow } from "./checkin";
import { SessionFlow, type ClientScenario } from "./session";
import type { EpisodeInfo } from "./episode";
import { pickSponsor } from "@/lib/server/sponsors";
import { voiceAllowance } from "@/lib/server/voice";
import { canUseAIVoice } from "@/lib/domain/voice";
import { SponsorCard } from "@/components/sponsor-card";
import { GENRES, WORLDS, byId } from "@/lib/domain/variety";

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
      format: (sc as { format?: string | null }).format ?? null,
      options: response ? sc.options : sc.options.map((o) => ({ id: o.id, text: o.text })),
      response: response ? { choice_id: response.choice_id, reasoning: response.reasoning, score: response.score, evaluation: response.evaluation } : null,
    };
  });

  // Story season info: earlier episodes of the same season give the "Previously" recap.
  let episode: EpisodeInfo | null = null;
  const v = session?.variety;
  if (session && v) {
    const { data: earlier } = await db
      .from("daily_sessions")
      .select("day_number, variety")
      .eq("user_id", user.id)
      .order("day_number", { ascending: true });
    const previously = ((earlier ?? []) as Pick<SessionRow, "day_number" | "variety">[])
      .filter((e) => e.day_number < session.day_number && e.variety?.season === v.season && e.variety.episode_summary)
      .map((e) => ({ episode: e.variety!.episode, title: e.variety!.episode_title, summary: e.variety!.episode_summary! }));
    episode = {
      season: v.season,
      episode: v.episode,
      finale: v.finale,
      world: byId(WORLDS, v.world)?.label ?? v.world,
      genre: byId(GENRES, v.genre)?.label ?? v.genre,
      previously,
      teaser: v.teaser || null,
      nextWorlds: (v.next_world_options ?? []).map((id) => ({ id, label: byId(WORLDS, id)?.label ?? id })),
      chosenWorld: state.profile.next_world ?? null,
    };
  }

  const allowance = session && !session.story_completed_at ? await voiceAllowance(user.id, session.id).catch(() => null) : null;
  const aiVoice =
    allowance && allowance.enabled
      ? { sessionId: session!.id, allowed: canUseAIVoice(allowance), pro: allowance.plan === "pro", remaining: Math.max(0, allowance.limit - allowance.used) }
      : null;
  const sponsor = session?.completed_at ? await pickSponsor(user.id, "after_session", { language: state.profile.language, skill: focus.dimension, day: state.today }) : null;

  return (
    <>
      <PageHeader
        eyebrow={<>Day {state.day} · {DIMENSION_META[focus.dimension].label}</>}
        title={focus.title}
        action={focus.personalised ? <Badge tone="primary">✨ For you</Badge> : undefined}
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
          episode={episode}
          aiVoice={aiVoice}
        />
      )}
      {sponsor && <div className="mt-8"><SponsorCard s={sponsor} /></div>}
    </>
  );
}
