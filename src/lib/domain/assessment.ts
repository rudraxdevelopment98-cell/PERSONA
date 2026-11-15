import { DIMENSIONS, type Dimension } from "./dimensions";

/**
 * Baseline assessment.
 *
 * Each dimension has four items:
 *  - three behavioural self-report statements (1 = never true of me ... 5 = almost always true)
 *    some of which are reverse-scored, so agreeing with them lowers the score;
 *  - one situational-judgement item whose options carry a fixed value from 1 to 5.
 *
 * Scoring rubric (shown to the user on the results page):
 *   item score     = value (or 6 - value for reverse-scored items), range 1-5
 *   dimension raw  = mean of its four item scores
 *   dimension 0-100 = (raw - 1) / 4 * 100, rounded
 *
 * These are self-development indicators, not clinical or psychometric measurements.
 */

export type LikertItem = {
  id: string;
  dimension: Dimension;
  kind: "likert";
  text: string;
  reverse: boolean;
};

export type SituationalItem = {
  id: string;
  dimension: Dimension;
  kind: "situational";
  text: string;
  options: { label: string; value: 1 | 2 | 3 | 4 | 5 }[];
};

export type AssessmentItem = LikertItem | SituationalItem;

export const LIKERT_SCALE = [
  { value: 1, label: "Almost never" },
  { value: 2, label: "Rarely" },
  { value: 3, label: "Sometimes" },
  { value: 4, label: "Often" },
  { value: 5, label: "Almost always" },
] as const;

const L = (id: string, dimension: Dimension, text: string, reverse = false): LikertItem => ({
  id,
  dimension,
  kind: "likert",
  text,
  reverse,
});

export const ASSESSMENT_ITEMS: AssessmentItem[] = [
  // Self-confidence
  L("conf_1", "confidence", "When I have an idea in a meeting or group, I share it without waiting for someone else to go first."),
  L("conf_2", "confidence", "I replay conversations afterwards, worrying about how I came across.", true),
  L("conf_3", "confidence", "I attempt tasks I have not done before, even when I might fail in front of others."),
  {
    id: "conf_sj",
    dimension: "confidence",
    kind: "situational",
    text: "Your manager praises a piece of work you did in front of the team. What is closest to your first reaction?",
    options: [
      { label: "Deflect it - say it was mostly luck or someone else's help", value: 1 },
      { label: "Feel uncomfortable and quickly change the subject", value: 2 },
      { label: "Thank them, then worry later that it was not really deserved", value: 3 },
      { label: "Thank them and briefly mention what you did well", value: 5 },
    ],
  },

  // Communication
  L("comm_1", "communication", "I can explain a complex idea so that someone outside my field understands it."),
  L("comm_2", "communication", "When I speak, I lose track of my point or ramble.", true),
  L("comm_3", "communication", "I check that I have understood someone correctly before responding."),
  {
    id: "comm_sj",
    dimension: "communication",
    kind: "situational",
    text: "You need to tell a colleague that their part of a shared project is late and is blocking you. You would most likely:",
    options: [
      { label: "Say nothing and work around it", value: 1 },
      { label: "Drop vague hints and hope they notice", value: 2 },
      { label: "Send a message describing the delay, its impact, and ask when it can be done", value: 5 },
      { label: "Complain to someone else about it", value: 1 },
    ],
  },

  // Decision-making
  L("dec_1", "decision_making", "I make everyday decisions quickly without second-guessing myself afterwards."),
  L("dec_2", "decision_making", "I delay important decisions because I am afraid of choosing wrongly.", true),
  L("dec_3", "decision_making", "Before a significant decision, I consider at least two realistic alternatives."),
  {
    id: "dec_sj",
    dimension: "decision_making",
    kind: "situational",
    text: "You receive two job offers with a 48-hour deadline. Which approach is closest to yours?",
    options: [
      { label: "Ask several people what they would do and go with the majority", value: 2 },
      { label: "List what matters most to you, compare both offers against it, then decide", value: 5 },
      { label: "Wait until the last moment hoping the answer becomes obvious", value: 1 },
      { label: "Pick the one with the higher salary without looking further", value: 3 },
    ],
  },

  // Emotional intelligence
  L("ei_1", "emotional_intelligence", "I can name the specific emotion I am feeling (e.g. disappointed rather than just 'bad')."),
  L("ei_2", "emotional_intelligence", "When I am upset, I say or do things I later regret.", true),
  L("ei_3", "emotional_intelligence", "I notice how my mood is affecting the way I treat other people."),
  {
    id: "ei_sj",
    dimension: "emotional_intelligence",
    kind: "situational",
    text: "You receive a blunt, critical email late in the evening. What do you usually do?",
    options: [
      { label: "Reply immediately while the frustration is fresh", value: 1 },
      { label: "Stew on it all night without replying", value: 2 },
      { label: "Notice the frustration, wait until morning, then reply to the substance", value: 5 },
      { label: "Forward it to a friend to complain before deciding", value: 3 },
    ],
  },

  // Social intelligence
  L("soc_1", "social_intelligence", "I can tell when someone is uncomfortable even if they do not say so."),
  L("soc_2", "social_intelligence", "I am surprised by how others reacted to something I said.", true),
  L("soc_3", "social_intelligence", "I adjust how I communicate depending on who I am talking to."),
  {
    id: "soc_sj",
    dimension: "social_intelligence",
    kind: "situational",
    text: "In a group discussion, one quiet member keeps starting to speak and getting interrupted. You:",
    options: [
      { label: "Do not notice - you are focused on the topic", value: 1 },
      { label: "Notice but stay out of it", value: 2 },
      { label: "Pause the conversation and invite them to finish their point", value: 5 },
      { label: "Mention it to them privately afterwards", value: 3 },
    ],
  },

  // Assertiveness
  L("asr_1", "assertiveness", "I say no to requests when I do not have the time or do not want to do them."),
  L("asr_2", "assertiveness", "I agree to things just to avoid conflict.", true),
  L("asr_3", "assertiveness", "I state my opinion even when I suspect others will disagree."),
  {
    id: "asr_sj",
    dimension: "assertiveness",
    kind: "situational",
    text: "A colleague repeatedly takes credit for your ideas in meetings. You:",
    options: [
      { label: "Let it go - it is not worth the tension", value: 1 },
      { label: "Become cold towards them without explaining why", value: 2 },
      { label: "Speak to them privately, describe what happened, and say what you expect next time", value: 5 },
      { label: "Call them out angrily in the next meeting", value: 2 },
    ],
  },

  // Independent thinking
  L("ind_1", "independent_thinking", "I form my own opinion before I find out what others think."),
  L("ind_2", "independent_thinking", "I change my view mainly because the people around me disagree with it.", true),
  L("ind_3", "independent_thinking", "I am comfortable holding a view that differs from my friends or family."),
  {
    id: "ind_sj",
    dimension: "independent_thinking",
    kind: "situational",
    text: "Everyone in your team supports a plan you think has a serious flaw. You:",
    options: [
      { label: "Assume they must be right since they all agree", value: 1 },
      { label: "Keep quiet but feel uneasy", value: 2 },
      { label: "Raise the flaw clearly, with your reasoning, and stay open to counter-arguments", value: 5 },
      { label: "Mention it only if someone directly asks you", value: 3 },
    ],
  },

  // Critical thinking
  L("crit_1", "critical_thinking", "When I hear a strong claim, I ask what evidence supports it."),
  L("crit_2", "critical_thinking", "I accept explanations that fit what I already believe without checking them.", true),
  L("crit_3", "critical_thinking", "I look for what could go wrong with a plan, including my own."),
  {
    id: "crit_sj",
    dimension: "critical_thinking",
    kind: "situational",
    text: "A viral post claims a new habit doubled someone's productivity. You:",
    options: [
      { label: "Start the habit straight away", value: 2 },
      { label: "Dismiss it without thinking about it", value: 2 },
      { label: "Ask what was measured, how, and whether it would apply to you before trying it", value: 5 },
      { label: "Share it with friends first", value: 1 },
    ],
  },

  // Leadership
  L("lead_1", "leadership", "When a group is stuck, I suggest a way forward."),
  L("lead_2", "leadership", "I take responsibility publicly when something I led goes wrong."),
  L("lead_3", "leadership", "I wait for someone else to organise things, even when I could.", true),
  {
    id: "lead_sj",
    dimension: "leadership",
    kind: "situational",
    text: "A project you are part of has no clear owner and is drifting. You:",
    options: [
      { label: "Keep doing your part and wait", value: 1 },
      { label: "Complain that nobody is organising it", value: 1 },
      { label: "Propose a simple plan and offer to coordinate it", value: 5 },
      { label: "Ask a manager to assign someone", value: 3 },
    ],
  },

  // Self-discipline
  L("disc_1", "self_discipline", "I do what I planned for the day even when I do not feel like it."),
  L("disc_2", "self_discipline", "I start personal goals with enthusiasm and abandon them within a few weeks.", true),
  L("disc_3", "self_discipline", "I keep commitments I make to myself as seriously as those I make to others."),
  {
    id: "disc_sj",
    dimension: "self_discipline",
    kind: "situational",
    text: "You planned an hour of focused study tonight, but you are tired and a friend invites you out. You:",
    options: [
      { label: "Go out - you will catch up some other time", value: 1 },
      { label: "Stay in but end up scrolling your phone", value: 2 },
      { label: "Do a shorter focused session first, then decide", value: 5 },
      { label: "Feel guilty whatever you choose", value: 2 },
    ],
  },
];

export const ITEMS_BY_ID = new Map(ASSESSMENT_ITEMS.map((i) => [i.id, i]));

export type AssessmentAnswer = { question_id: string; value: number };

export function itemScore(item: AssessmentItem, value: number): number {
  if (item.kind === "likert" && item.reverse) return 6 - value;
  return value;
}

/** Deterministic, transparent baseline scoring. Returns null for dimensions with no answers. */
export function scoreAssessment(answers: AssessmentAnswer[]): Record<Dimension, number | null> {
  const sums = new Map<Dimension, { total: number; n: number }>();
  for (const a of answers) {
    const item = ITEMS_BY_ID.get(a.question_id);
    if (!item || !Number.isInteger(a.value) || a.value < 1 || a.value > 5) continue;
    const s = sums.get(item.dimension) ?? { total: 0, n: 0 };
    s.total += itemScore(item, a.value);
    s.n += 1;
    sums.set(item.dimension, s);
  }
  const out = {} as Record<Dimension, number | null>;
  for (const d of DIMENSIONS) {
    const s = sums.get(d);
    out[d] = s && s.n > 0 ? Math.round(((s.total / s.n - 1) / 4) * 100) : null;
  }
  return out;
}

export function isAssessmentComplete(answers: AssessmentAnswer[]): boolean {
  return isCompleteForDepth(answers, "deep");
}

// ---------------------------------------------------------------------------
// Assessment depth. Each shorter set is a subset of the longer one, so a user
// can start quick and "go deeper" later without re-answering anything.
// ---------------------------------------------------------------------------

export const DEPTHS = ["quick", "standard", "deep"] as const;
export type AssessmentDepth = (typeof DEPTHS)[number];

/**
 * Per dimension: quick = the situation item; standard = + one positively and one
 * reverse-worded statement (balanced against "agree with everything"); deep = all four.
 */
function inDepth(item: AssessmentItem, depth: AssessmentDepth): boolean {
  if (depth === "deep" || item.kind === "situational") return true;
  if (depth === "quick") return false;
  const statements = ASSESSMENT_ITEMS.filter((i): i is LikertItem => i.dimension === item.dimension && i.kind === "likert");
  const positive = statements.find((i) => !i.reverse);
  const reversed = statements.find((i) => i.reverse);
  return item === positive || item === reversed;
}

export function itemsForDepth(depth: AssessmentDepth): AssessmentItem[] {
  return ASSESSMENT_ITEMS.filter((i) => inDepth(i, depth));
}

export const DEPTH_INFO: Record<AssessmentDepth, { questions: number; minutes: number; perSkill: number; heldBackRequired: boolean }> = {
  quick: { questions: itemsForDepth("quick").length, minutes: 3, perSkill: 1, heldBackRequired: false },
  standard: { questions: itemsForDepth("standard").length, minutes: 7, perSkill: 3, heldBackRequired: false },
  deep: { questions: itemsForDepth("deep").length, minutes: 12, perSkill: 4, heldBackRequired: true },
};

export function isDepth(v: unknown): v is AssessmentDepth {
  return typeof v === "string" && (DEPTHS as readonly string[]).includes(v);
}

export function isCompleteForDepth(answers: AssessmentAnswer[], depth: AssessmentDepth): boolean {
  const answered = new Set(answers.map((a) => a.question_id));
  return itemsForDepth(depth).every((i) => answered.has(i.id));
}

/** Days after the start during which a quick/standard baseline can still be deepened. */
export const UPGRADE_WINDOW_DAYS = 7;
