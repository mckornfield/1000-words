import type { Card } from "@1000words/content";
import type { ProgressMap } from "./types";

export interface BuildSessionOptions {
  /** Treated as "now" when deciding which cards are due. Defaults to new Date(). */
  now?: Date;
  /** Max brand-new (never-seen) cards to introduce this session. */
  newCardsPerDay?: number;
  /** Hard cap on total cards in the returned session. */
  maxCards?: number;
}

/**
 * Build an ordered review queue: cards due now (from progress) plus up to
 * `newCardsPerDay` unseen cards, capped at `maxCards`.
 *
 * STUB — queue selection/ordering is implemented under task A1 (TDD). See docs/PLAN.md.
 */
export function buildSession(
  _cards: Card[],
  _progress: ProgressMap,
  _opts: BuildSessionOptions = {},
): Card[] {
  throw new Error("buildSession not implemented yet (task A1)");
}
