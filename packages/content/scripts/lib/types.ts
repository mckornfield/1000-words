import { LANGUAGE_REGISTRY, type LangPair } from "../../src";

export interface DraftedCard {
  word: string;
  pronunciation?: string;
  translation: string;
  partOfSpeech: string;
  exampleSentence: string;
  exampleTranslation: string;
}

export interface LangPairConfig {
  langPair: LangPair;
  targetCode: "es" | "zh" | "ko" | "ja";
  targetName: string;
  sourceName: string;
  frequencyFile: string;
  idPrefix: string;
  elevenLabsVoiceEnv: string;
}

export const LANG_PAIR_CONFIGS = Object.fromEntries(
  LANGUAGE_REGISTRY.map((entry) => [
    entry.id,
    {
      langPair: entry.id,
      targetCode: entry.target.code,
      targetName: entry.target.displayName,
      sourceName: entry.source.displayName,
      frequencyFile: entry.frequencyFile,
      idPrefix: entry.cardIdPrefix,
      elevenLabsVoiceEnv: entry.elevenLabsVoiceEnv,
    },
  ]),
) as Record<LangPair, LangPairConfig>;
