/** Free vs Pro. The daily check-in and streak are always free; full episodes are limited after week 1. */

export const FREE_LIMITS = {
  decisionsPerWeek: 3,
  communicationPerWeek: 3,
  coachPerDay: 6,
  circlesOwned: 1,
  activeRacesCreated: 2,
  /** Full daily episodes for everyone during the first week of the programme. */
  dailyEpisodeDays: 7,
  /** After that, free accounts get this many full episodes per rolling 7 days; other days are lite days. */
  episodesPerWeek: 3,
} as const;

export const TRIAL_DAYS = 7;

/** Default display prices (USD). The checkout shows the local price and tax for the buyer's country. */
export const DISPLAY_PRICES = { month: 6.99, year: 49.99 } as const;

/** Prices shown to visitors in India; set the same amounts as India price overrides in Paddle. */
export const DISPLAY_PRICES_INR = { month: 199, year: 1499 } as const;

export const FEATURES: { label: string; free: string | boolean; pro: string | boolean }[] = [
  { label: "Daily check-in, insight and streak", free: true, pro: true },
  { label: "Full episode (story, scenarios, challenge, reflection)", free: `Daily in week 1, then ${FREE_LIMITS.episodesPerWeek} per week`, pro: "Every day" },
  { label: "Initial assessment - Quick, Standard or Deep", free: true, pro: true },
  { label: "Progress tracking, XP, levels, badges, streaks", free: true, pro: true },
  { label: "Friends, cheers and comparisons", free: true, pro: true },
  { label: "Decision Lab scenarios", free: `${FREE_LIMITS.decisionsPerWeek} per week`, pro: "Unlimited" },
  { label: "Communication Lab exercises (type or speak)", free: `${FREE_LIMITS.communicationPerWeek} per week`, pro: "Unlimited" },
  { label: "AI Coach messages", free: `${FREE_LIMITS.coachPerDay} per day`, pro: "Unlimited" },
  { label: "Circles you can start", free: String(FREE_LIMITS.circlesOwned), pro: "Up to 5" },
  { label: "Races you can start at once", free: String(FREE_LIMITS.activeRacesCreated), pro: "Unlimited" },
  { label: "Listen to your story", free: "Device voice", pro: "Natural AI narrator" },
  { label: "Pick the world for your next story season any time", free: "At each finale", pro: "Any time" },
  { label: "Pro badge on your profile", free: false, pro: true },
];

export type PlanInfo = {
  plan: "free" | "pro";
  status: "active" | "trialing" | "past_due" | "paused" | "canceled" | null;
  source: "paddle" | "trial" | "coupon" | "admin" | null;
  endsAt: string | null;
  cancelAt: string | null;
  billingCycle: "month" | "year" | null;
  trialAvailable: boolean;
  /** Limits don't apply: Pro, admins, or the user's own AI key pays for AI use. */
  unlimitedAI: boolean;
  isAdmin: boolean;
};
