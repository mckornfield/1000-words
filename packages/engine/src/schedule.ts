import {
  createEmptyCard,
  fsrs,
  Rating as FsrsRating,
  State,
  type Card as FsrsCard,
} from "ts-fsrs";
import type { FsrsState, Rating } from "./types";

const scheduler = fsrs();

const RATING_MAP = {
  again: FsrsRating.Again,
  hard: FsrsRating.Hard,
  good: FsrsRating.Good,
  easy: FsrsRating.Easy,
} as const;

/** Convert a ts-fsrs Card into our serializable FsrsState. */
function toState(card: FsrsCard): FsrsState {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review ? card.last_review.toISOString() : null,
  };
}

/** Hydrate our serialized FsrsState back into the ts-fsrs Card shape. */
function fromState(state: FsrsState): FsrsCard {
  return {
    due: new Date(state.due),
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: state.elapsedDays,
    scheduled_days: state.scheduledDays,
    learning_steps: state.learningSteps,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state as State,
    last_review: state.lastReview ? new Date(state.lastReview) : undefined,
  };
}

/** Fresh scheduling state for a card the learner has never seen. */
export function initialState(now: Date = new Date()): FsrsState {
  return toState(createEmptyCard(now));
}

/** Apply a review rating to a card's scheduling state and return the next state. */
export function scheduleReview(
  state: FsrsState,
  rating: Rating,
  now: Date = new Date(),
): FsrsState {
  const { card } = scheduler.next(fromState(state), now, RATING_MAP[rating]);
  return toState(card);
}
