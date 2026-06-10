/**
 * The learner's rating of how well they recalled a card, mapped to FSRS grades.
 * This is the app-facing vocabulary; the ts-fsrs Rating enum is an internal detail.
 */
export type Rating = "again" | "hard" | "good" | "easy";

/**
 * Per-user, per-card scheduling state. This is the unit persisted in Supabase
 * (`card_progress`), keyed by the card id. All dates are ISO-8601 strings so the
 * shape is directly JSON / Postgres friendly.
 *
 * Field meanings mirror the FSRS algorithm:
 * - stability  : days until recall probability drops to ~90%
 * - difficulty : intrinsic hardness of the card (FSRS scale)
 * - state      : ts-fsrs State enum value (New/Learning/Review/Relearning)
 */
export interface FsrsState {
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: string | null;
}

/** Map from card id -> that card's scheduling state for one user. */
export type ProgressMap = Record<string, FsrsState>;
