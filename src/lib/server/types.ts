import type { SessionVariety } from "./variety";
import type { Dimension } from "@/lib/domain/dimensions";
import type {
  CheckinAnalysis,
  CheckinQuestion,
  CommunicationEvaluation,
  CommunicationPrompt,
  DecisionEvaluation,
  DecisionScenario,
  DevelopmentProfile,
  ReflectionFeedback,
  ScenarioEvaluation,
  SessionScenario,
} from "@/lib/ai/schemas";

export type ProfileRow = {
  id: string;
  display_name: string | null;
  programme_start_date: string | null;
  timezone: string;
  development_profile: DevelopmentProfile | null;
  roadmap: unknown;
  coach_journal_access: boolean;
  language: "en" | "hinglish" | "hi";
  next_world?: string | null;
  suspended_at?: string | null;
  reminders_enabled?: boolean;
  life_stage?: string | null;
  life_areas?: string[] | null;
  created_at: string;
};

export type AssessmentRow = {
  id: string;
  user_id: string;
  kind: "baseline" | "checkpoint";
  depth: "quick" | "standard" | "deep";
  status: "in_progress" | "completed";
  scores: Record<Dimension, number> | null;
  reflections: { held_back?: string; goal: string } | null;
  started_at: string;
  completed_at: string | null;
};

export type CheckinAnswer = { id: string; value: string | number };

export type CheckinRow = {
  id: string;
  user_id: string;
  day_number: number;
  checkin_date: string;
  questions: CheckinQuestion[];
  answers: CheckinAnswer[] | null;
  analysis: CheckinAnalysis | null;
  lens?: string | null;
  created_at: string;
  completed_at: string | null;
};

export type SessionRow = {
  id: string;
  user_id: string;
  day_number: number;
  session_date: string;
  focus_skill: Dimension;
  introduction: { title: string; why_it_matters: string; key_idea: string; what_you_will_practise: string[]; focus_title: string };
  scenarios: SessionScenario[];
  challenge: { title: string; description: string; success_criteria: string[]; difficulty: string };
  reflection_questions: string[];
  story_progress: number;
  story_completed_at: string | null;
  scenarios_completed_at: string | null;
  challenge_status: "pending" | "completed" | "skipped";
  challenge_notes: string | null;
  challenge_updated_at: string | null;
  reflection_answers: string[] | null;
  reflection_feedback: ReflectionFeedback | null;
  completed_at: string | null;
  created_at: string;
  variety: SessionVariety | null;
};

export type StoryRow = {
  id: string;
  session_id: string;
  title: string;
  body: string;
  word_count: number;
  insights: { title: string; explanation: string }[];
  target_skills: string[];
  choice?: { question: string; options: { id: string; text: string; vibe?: string }[] } | null;
  chosen?: string | null;
  choice_feedback?: string | null;
  created_at: string;
};

export type ScenarioResponseRow = {
  id: string;
  session_id: string | null;
  scenario_index: number;
  skill: Dimension;
  choice_id: string;
  reasoning: string;
  response_time_ms: number | null;
  evaluation: ScenarioEvaluation | null;
  score: number | null;
  created_at: string;
};

export type DecisionLogRow = {
  id: string;
  category: string;
  difficulty: "everyday" | "moderate" | "high_stakes";
  scenario: DecisionScenario;
  chosen_option: string | null;
  reasoning: string | null;
  confidence: number | null;
  first_choice_ms: number | null;
  total_time_ms: number | null;
  choice_changes: number | null;
  evaluation: DecisionEvaluation | null;
  score: number | null;
  created_at: string;
  completed_at: string | null;
};

export type ExerciseRow = {
  id: string;
  exercise_type: string;
  skill: Dimension;
  prompt: CommunicationPrompt;
  response: string | null;
  evaluation: CommunicationEvaluation | null;
  score: number | null;
  input_mode: "text" | "voice";
  created_at: string;
  completed_at: string | null;
};

export type SkillProgressRow = {
  dimension: Dimension;
  baseline: number;
  current: number;
  self_reported: number | null;
  demonstrated: number | null;
  consistency: number | null;
  evidence_count: number;
  explanation: string | null;
  updated_at: string;
};

export type ScoreHistoryRow = {
  dimension: Dimension;
  score: number;
  source: string;
  recorded_at: string;
};

export type JournalRow = {
  id: string;
  title: string;
  body: string;
  entry_type: "reflection" | "observation" | "decision" | "emotion" | "lesson";
  mood: number | null;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type AchievementRow = { code: string; title: string; description: string; earned_at: string };
