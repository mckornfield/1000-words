import type { LangPair } from "../../src/schema";

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

export const LANG_PAIR_CONFIGS: Record<LangPair, LangPairConfig> = {
  "en-es": {
    langPair: "en-es",
    targetCode: "es",
    targetName: "Spanish",
    sourceName: "English",
    frequencyFile: "es.txt",
    idPrefix: "es",
    elevenLabsVoiceEnv: "ELEVENLABS_VOICE_ES",
  },
  "en-zh": {
    langPair: "en-zh",
    targetCode: "zh",
    targetName: "Mandarin Chinese (simplified characters)",
    sourceName: "English",
    frequencyFile: "zh.txt",
    idPrefix: "zh",
    elevenLabsVoiceEnv: "ELEVENLABS_VOICE_ZH",
  },
  "en-ko": {
    langPair: "en-ko",
    targetCode: "ko",
    targetName: "Korean",
    sourceName: "English",
    frequencyFile: "ko.txt",
    idPrefix: "ko",
    elevenLabsVoiceEnv: "ELEVENLABS_VOICE_KO",
  },
  "en-ja": {
    langPair: "en-ja",
    targetCode: "ja",
    targetName: "Japanese",
    sourceName: "English",
    frequencyFile: "ja.txt",
    idPrefix: "ja",
    elevenLabsVoiceEnv: "ELEVENLABS_VOICE_JA",
  },
};
