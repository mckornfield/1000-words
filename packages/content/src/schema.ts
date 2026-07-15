import { z } from "zod";

/**
 * The set of language pairs the app ships with. Each pair is "<source>-<target>"
 * where source is always the learner's known language (English for now).
 */
export const LANG_PAIRS = ["en-es", "en-zh", "en-ko", "en-ja"] as const;
export const LangPairSchema = z.enum(LANG_PAIRS);
export type LangPair = z.infer<typeof LangPairSchema>;

/**
 * A single learnable item: one of the ~1000 most common words/phrases in the
 * target language, with its translation, an example sentence, and bundled audio.
 *
 * Cards are STATIC, SHARED content (identical for every user). They are bundled
 * in the app. Per-user scheduling state lives separately in Supabase, keyed by
 * `id` — see the engine's FsrsState and the progress sync API.
 */
export const CardSchema = z.object({
  /** Stable unique id, e.g. "es-0001". Used as the key for per-user progress. */
  id: z.string().min(1),
  langPair: LangPairSchema,
  /** The word/phrase in the target language (e.g. Spanish "hola"). */
  word: z.string().min(1),
  /** The English translation (e.g. "hello"). */
  translation: z.string().min(1),
  /** Optional grammatical category, e.g. "noun", "verb", "phrase". */
  partOfSpeech: z.string().min(1).optional(),
  /** An example sentence in the target language. */
  exampleSentence: z.string().min(1),
  /** The English translation of the example sentence. */
  exampleTranslation: z.string().min(1),
  /**
   * Optional pronunciation hint for scripts where the written form doesn't tell
   * the learner how to say it — pinyin (with tone marks) for Chinese, etc.
   * Omitted for languages whose orthography already encodes pronunciation (Spanish).
   */
  pronunciation: z.string().min(1).optional(),
  /** App-relative path to the bundled mp3, e.g. "assets/audio/es/es-0001.mp3". */
  audio: z.string().regex(/^assets\/audio\/[a-z]{2}\/.+\.mp3$/),
});
export type Card = z.infer<typeof CardSchema>;

export const CardDeckSchema = z.array(CardSchema);
export type CardDeck = z.infer<typeof CardDeckSchema>;
