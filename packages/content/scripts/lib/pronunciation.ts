import { pinyin } from "pinyin-pro";
import type { LangPair } from "../../src/schema";

/**
 * Compute a pronunciation hint for a target-language word, or undefined when the
 * language's orthography already tells the learner how to say it (Spanish).
 *
 * For Chinese we emit tone-mark pinyin (e.g. "nǐ hǎo"). `pinyin-pro` segments
 * at word level and uses a polyphone dictionary, so common-word readings are
 * disambiguated without an LLM.
 */
export function pronunciationFor(langPair: LangPair, word: string): string | undefined {
  if (langPair === "en-zh") {
    return pinyin(word, { toneType: "symbol" });
  }
  return undefined;
}
