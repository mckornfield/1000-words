import type { Card } from "../schema";

/**
 * A tiny hand-written deck so the UI (Lane B) can be built and tested before the
 * real machine-assisted content pipeline (A3) generates the full 1000-card decks.
 * Not for production use.
 */
export const SAMPLE_CARDS: Card[] = [
  {
    id: "es-0001",
    langPair: "en-es",
    word: "hola",
    translation: "hello",
    partOfSpeech: "interjection",
    exampleSentence: "Hola, ¿cómo estás?",
    exampleTranslation: "Hello, how are you?",
    audio: "assets/audio/es/es-0001.mp3",
  },
  {
    id: "es-0002",
    langPair: "en-es",
    word: "gracias",
    translation: "thank you",
    partOfSpeech: "interjection",
    exampleSentence: "Muchas gracias por tu ayuda.",
    exampleTranslation: "Thank you very much for your help.",
    audio: "assets/audio/es/es-0002.mp3",
  },
  {
    id: "zh-0001",
    langPair: "en-zh",
    word: "你好",
    translation: "hello",
    partOfSpeech: "interjection",
    exampleSentence: "你好，很高兴认识你。",
    exampleTranslation: "Hello, nice to meet you.",
    audio: "assets/audio/zh/zh-0001.mp3",
  },
];
