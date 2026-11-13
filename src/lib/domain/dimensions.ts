export const DIMENSIONS = [
  "confidence",
  "communication",
  "decision_making",
  "emotional_intelligence",
  "social_intelligence",
  "assertiveness",
  "independent_thinking",
  "critical_thinking",
  "leadership",
  "self_discipline",
] as const;

export type Dimension = (typeof DIMENSIONS)[number];

export const DIMENSION_META: Record<Dimension, { label: string; short: string; description: string }> = {
  confidence: {
    label: "Self-confidence",
    short: "Confidence",
    description: "Trust in your own judgement and ability to act without constant reassurance.",
  },
  communication: {
    label: "Communication",
    short: "Communication",
    description: "Expressing ideas clearly, listening well and adapting to the audience.",
  },
  decision_making: {
    label: "Decision-making",
    short: "Decisions",
    description: "Making timely, reasoned choices and owning their consequences.",
  },
  emotional_intelligence: {
    label: "Emotional intelligence",
    short: "Emotional IQ",
    description: "Recognising, understanding and regulating your own emotions.",
  },
  social_intelligence: {
    label: "Social intelligence",
    short: "Social IQ",
    description: "Reading people and situations, and responding to them appropriately.",
  },
  assertiveness: {
    label: "Assertiveness",
    short: "Assertiveness",
    description: "Stating needs, opinions and boundaries directly and respectfully.",
  },
  independent_thinking: {
    label: "Independent thinking",
    short: "Independence",
    description: "Forming your own views rather than defaulting to the group or authority.",
  },
  critical_thinking: {
    label: "Critical thinking",
    short: "Critical thinking",
    description: "Questioning assumptions, weighing evidence and spotting weak reasoning.",
  },
  leadership: {
    label: "Leadership behaviour",
    short: "Leadership",
    description: "Taking initiative, influencing others and taking responsibility for outcomes.",
  },
  self_discipline: {
    label: "Self-discipline",
    short: "Discipline",
    description: "Following through on commitments when motivation is low.",
  },
};

export function isDimension(value: unknown): value is Dimension {
  return typeof value === "string" && (DIMENSIONS as readonly string[]).includes(value);
}

export function dimensionLabel(d: string): string {
  return isDimension(d) ? DIMENSION_META[d].label : d;
}
