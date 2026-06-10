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

const DEFAULT_NEW_CARDS_PER_DAY = 10;
const DEFAULT_MAX_CARDS = 100;

/**
 * Build an ordered review queue: cards due now (from progress) plus up to
 * `newCardsPerDay` unseen cards, capped at `maxCards`.
 *
 * Order: due cards by due-date ascending, followed by unseen cards in their
 * input order.
 */
export function buildSession(
  cards: Card[],
  progress: ProgressMap,
  opts: BuildSessionOptions = {},
): Card[] {
  const now = opts.now ?? new Date();
  const newCardsPerDay = opts.newCardsPerDay ?? DEFAULT_NEW_CARDS_PER_DAY;
  const maxCards = opts.maxCards ?? DEFAULT_MAX_CARDS;
  const nowMs = now.getTime();

  const due: { card: Card; dueMs: number }[] = [];
  const unseen: Card[] = [];
  for (const card of cards) {
    const state = progress[card.id];
    if (!state) {
      unseen.push(card);
      continue;
    }
    const dueMs = new Date(state.due).getTime();
    if (dueMs <= nowMs) due.push({ card, dueMs });
  }

  due.sort((a, b) => a.dueMs - b.dueMs);
  const session = due.map((d) => d.card).concat(unseen.slice(0, newCardsPerDay));
  return session.slice(0, maxCards);
}
