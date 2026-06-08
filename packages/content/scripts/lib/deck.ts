import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CardDeckSchema, type Card, type LangPair } from "../../src/schema";
import { DATA_DIR } from "./paths";
import type { LangPairConfig } from "./types";

export function deckPath(langPair: LangPair): string {
  return join(DATA_DIR, `${langPair}.json`);
}

export function loadDeck(langPair: LangPair): Card[] {
  const path = deckPath(langPair);
  if (!existsSync(path)) return [];
  const parsed = CardDeckSchema.safeParse(JSON.parse(readFileSync(path, "utf8")));
  if (!parsed.success) {
    throw new Error(`existing deck ${path} is invalid: ${parsed.error.message}`);
  }
  return parsed.data;
}

export function saveDeck(langPair: LangPair, cards: Card[]): void {
  mkdirSync(DATA_DIR, { recursive: true });
  const validated = CardDeckSchema.parse(cards);
  writeFileSync(deckPath(langPair), JSON.stringify(validated, null, 2) + "\n");
}

export function cardId(cfg: LangPairConfig, index: number): string {
  return `${cfg.idPrefix}-${String(index + 1).padStart(4, "0")}`;
}

export function audioRelPath(cfg: LangPairConfig, id: string): string {
  return `assets/audio/${cfg.targetCode}/${id}.mp3`;
}
