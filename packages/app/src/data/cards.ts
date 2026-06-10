import { SAMPLE_CARDS, type Card, type LangPair } from "@1000words/content";

export interface CardRepository {
  listLangPairs(): LangPair[];
  listCards(langPair?: LangPair): Card[];
  findCard(cardId: string): Card | undefined;
}

function uniqueLangPairs(cards: Card[]): LangPair[] {
  return [...new Set(cards.map((card) => card.langPair))] as LangPair[];
}

export function createCardRepository(cards: Card[]): CardRepository {
  return {
    listLangPairs() {
      return uniqueLangPairs(cards);
    },
    listCards(langPair) {
      return langPair ? cards.filter((card) => card.langPair === langPair) : [...cards];
    },
    findCard(cardId) {
      return cards.find((card) => card.id === cardId);
    },
  };
}

export const localCardRepository = createCardRepository(SAMPLE_CARDS);