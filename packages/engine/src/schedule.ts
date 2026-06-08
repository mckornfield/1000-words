import { createEmptyCard, type Card as FsrsCard } from "ts-fsrs";
import type { FsrsState, Rating } from "./types";

/** Convert a ts-fsrs Card into our serializable FsrsState. */
function toState(card: FsrsCard): FsrsState {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review ? card.last_review.toISOString() : null,
  };
}

/** Fresh scheduling state for a card the learner has never seen. */
export function initialState(now: Date = new Date()): FsrsState {
  return toState(createEmptyCard(now));
}

/**
 * Apply a review rating to a card's scheduling state and return the next state.
 *
 * STUB — full FSRS scheduling is implemented under task A1 (TDD). See docs/PLAN.md.
 */
export function scheduleReview(
  _state: FsrsState,
  _rating: Rating,
  _now: Date = new Date(),
): FsrsState {
  throw new Error("scheduleReview not implemented yet (task A1)");
}
