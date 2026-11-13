import { z } from "zod";
import { DIMENSIONS } from "@/lib/domain/dimensions";

const dimension = z.enum(DIMENSIONS);

// Numbers are clamped after parsing rather than rejected: structured outputs
// guarantee the shape, and the model occasionally lands one point outside a range.
const score100 = z.number().transform((n) => Math.round(Math.min(100, Math.max(0, n))));
const score25 = z.number().transform((n) => Math.round(Math.min(25, Math.max(0, n))));

export const developmentProfileSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.object({ dimension, insight: z.string() })),
  growth_areas: z.array(z.object({ dimension, insight: z.string(), likely_pattern: z.string() })),
  behavioural_patterns: z.array(z.string()),
  roadmap: z.array(
    z.object({
      phase: z.number(),
      goal: z.string(),
      personal_emphasis: z.string(),
      milestones: z.array(z.string()),
    }),
  ),
  first_week_focus: z.string(),
});
export type DevelopmentProfile = z.infer<typeof developmentProfileSchema>;

export const checkinQuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  type: z.enum(["scale", "text", "choice"]),
  dimension: dimension.nullable(),
  scale_low_label: z.string().nullable(),
  scale_high_label: z.string().nullable(),
  options: z.array(z.string()).nullable(),
  purpose: z.string(),
});
export type CheckinQuestion = z.infer<typeof checkinQuestionSchema>;

export const checkinQuestionsSchema = z.object({ questions: z.array(checkinQuestionSchema) });

export const checkinAnalysisSchema = z.object({
  summary: z.string(),
  emotional_state: z.string(),
  patterns: z.array(z.string()),
  observation: z.string(),
  suggestion_for_today: z.string(),
});
export type CheckinAnalysis = z.infer<typeof checkinAnalysisSchema>;

const scenarioOption = z.object({
  id: z.string(),
  text: z.string(),
  consequence: z.string(),
  quality: z.enum(["strong", "reasonable", "weak"]),
});

export const sessionScenarioSchema = z.object({
  title: z.string(),
  situation: z.string(),
  question: z.string(),
  skill: dimension,
  options: z.array(scenarioOption),
});
export type SessionScenario = z.infer<typeof sessionScenarioSchema>;

export const dailySessionSchema = z.object({
  introduction: z.object({
    title: z.string(),
    why_it_matters: z.string(),
    key_idea: z.string(),
    what_you_will_practise: z.array(z.string()),
  }),
  story: z.object({
    title: z.string(),
    body: z.string(),
    insights: z.array(z.object({ title: z.string(), explanation: z.string() })),
  }),
  scenarios: z.array(sessionScenarioSchema),
  challenge: z.object({
    title: z.string(),
    description: z.string(),
    success_criteria: z.array(z.string()),
    difficulty: z.enum(["gentle", "stretch", "bold"]),
  }),
  reflection_questions: z.array(z.string()),
});
export type DailySessionContent = z.infer<typeof dailySessionSchema>;

const feedbackFields = {
  what_went_well: z.string(),
  to_improve: z.string(),
  practise_next: z.string(),
};

export const scenarioEvaluationSchema = z.object({
  rubric: z.object({
    situational_awareness: score25,
    quality_of_reasoning: score25,
    independence: score25,
    practicality: score25,
  }),
  ...feedbackFields,
  pattern_note: z.string(),
});
export type ScenarioEvaluation = z.infer<typeof scenarioEvaluationSchema>;

export const reflectionFeedbackSchema = z.object({
  summary: z.string(),
  ...feedbackFields,
});
export type ReflectionFeedback = z.infer<typeof reflectionFeedbackSchema>;

export const decisionScenarioSchema = z.object({
  title: z.string(),
  context: z.string(),
  stakes: z.string(),
  constraints: z.array(z.string()),
  options: z.array(z.object({ id: z.string(), text: z.string() })),
});
export type DecisionScenario = z.infer<typeof decisionScenarioSchema>;

export const decisionEvaluationSchema = z.object({
  rubric: z.object({
    clear_criteria: score25,
    alternatives_considered: score25,
    risk_and_consequences: score25,
    ownership: score25,
  }),
  option_consequences: z.array(z.object({ id: z.string(), consequence: z.string() })),
  biases_noticed: z.array(z.string()),
  hesitation_insight: z.string(),
  ...feedbackFields,
});
export type DecisionEvaluation = z.infer<typeof decisionEvaluationSchema>;

export const communicationPromptSchema = z.object({
  title: z.string(),
  setting: z.string(),
  other_person: z.string(),
  they_say: z.string(),
  your_goal: z.string(),
});
export type CommunicationPrompt = z.infer<typeof communicationPromptSchema>;

export const communicationEvaluationSchema = z.object({
  rubric: z.object({
    clarity: score25,
    assertiveness: score25,
    empathy: score25,
    composure: score25,
  }),
  ...feedbackFields,
  stronger_version: z.string(),
});
export type CommunicationEvaluation = z.infer<typeof communicationEvaluationSchema>;

export function rubricTotal(rubric: Record<string, number>): number {
  return score100.parse(Object.values(rubric).reduce((a, b) => a + b, 0));
}
