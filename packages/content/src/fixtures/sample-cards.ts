import { CardDeckSchema, type Card } from "../schema";
import cardDatabase from "./card-database.json";

/**
 * A tiny hand-written deck so the UI (Lane B) can be built and tested before the
 * real machine-assisted content pipeline (A3) generates the full 1000-card decks.
 * Not for production use.
 */
export const SAMPLE_CARDS: Card[] = CardDeckSchema.parse(cardDatabase);
