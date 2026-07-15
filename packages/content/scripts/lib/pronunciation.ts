import { pinyin } from "pinyin-pro";
import type { LangPair } from "../../src/schema";

/**
 * Compute a pronunciation hint for a target-language word, or undefined when the
 * language's orthography already tells the learner how to say it (Spanish, Korean).
 *
 * - Chinese: tone-mark pinyin via `pinyin-pro` (e.g. "nǐ hǎo").
 * - Japanese: Hepburn romaji requested from the LLM at draft time; this
 *   function returns undefined so the draft prompt handles it instead.
 * - Korean: Revised Romanization requested from the LLM at draft time.
 */
export function pronunciationFor(langPair: LangPair, word: string): string | undefined {
  if (langPair === "en-zh") {
    return pinyin(word, { toneType: "symbol" });
  }
  // Japanese pronunciation (hiragana) is requested via the LLM draft prompt.
  // Korean Hangul is self-pronouncing — no hint needed.
  return undefined;
}
